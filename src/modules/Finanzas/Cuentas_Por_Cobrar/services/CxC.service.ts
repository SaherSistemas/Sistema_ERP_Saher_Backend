import { Transaction, Op, QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICapturarPago, IAplicarPago, ICapturarPagoCliente } from '../interface/CxC.interface';
import { CxCRepository } from '../repositories/CxC.repository';
import { Pago_CxCRepository } from '../repositories/Pago_CxC.repository';
import { AgenteRepository } from '../../../Comercial/Agente_Venta/repositories/Agente.repository';
import { RemisionRepository } from '../../Remisiones/repositories/Remision.repository';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Facturas from '../../../Facturas/model/Facturas.model';
import Remision from '../../Remisiones/model/Remision.model';
import Colonia from '../../../../models/Ubicacion/Colonia';
import Pago_CxC from '../model/Pago_CxC.model';
import FacturaPagoCFDI from '../../../Facturas/model/Factura_Pago_CFDI.model';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import { generarTxtPago, derivarSeries, EmisorTxt, ReceptorTxt, DocumentoPagoTxt } from '../../../Facturas/helpers/cfdi_txt.helper';
import { calcularImpuestosProporcionalesPago as _impuestosProporcionalesPago, resolverGrupoPagoP } from '../../../Facturas/helpers/factura.helper';
import { FacturacionRepository } from '../../../Facturas/repositories/Facturacion.repository';
import EmpresaSucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import { generarReciboPDFBuffer } from '../helpers/recibo_cobranza.pdf';
import { timbrarIngresoPublicoGeneral, generarFacturaAbonoPublicoGeneral, verificarAdmin } from '../../../Facturas/services/Facturacion.service';
import { v4 as uuidv4 } from 'uuid';
import Cat_Bancos from '../../../Catalogos/model/Cat_Bancos';

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: obtiene datos del emisor desde la BD
// ─────────────────────────────────────────────────────────────────────────────
async function _getEmisor(id_empresa?: string): Promise<EmisorTxt & { num_cuenta_banco?: string | null; rfc_banco?: string | null } | null> {
    const empresa = id_empresa
        ? await EmpresaSucursal.findByPk(id_empresa, { raw: true }) as any
        : await EmpresaSucursal.findOne({ raw: true }) as any;
    if (!empresa) return null;

    // Traer RFC del banco de la empresa si tiene banco configurado
    let rfc_banco: string | null = null;
    if (empresa.id_banco_empresa) {
         const banco = await Cat_Bancos.findByPk(empresa.id_banco_empresa, { raw: true }) as any;
        rfc_banco = banco?.rfc_banco?.trim() || null;
    }

    return {
        nom_empre:            empresa.nom_empre_facturacion?.trim() || empresa.nom_empre,
        rfc_empre:            empresa.rfc_empre,
        regimen_fiscal_empre: empresa.regimen_fiscal_empre ?? '601',
        serie_ingreso:        empresa.serie_facturacion_empre ?? 'FSH',
        lugar_expedicion:     empresa.lugar_expedicion ?? '80160',
        num_cuenta_banco:     empresa.num_cuenta_banco?.trim() || null,
        rfc_banco,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Registra UN recibo (abonos a varias CxC de un mismo cliente) dentro de la
//  transacción recibida. Cada abono queda en estatus CAP (pendiente de aplicar).
//  `prefijo` arma el folio {prefijo}_{consecutivo} cuando no se manda uno propio.
// ─────────────────────────────────────────────────────────────────────────────
// Clave para juntar cuentas en un mismo recibo: el RFC. Los RFC genéricos (público en general / extranjero) y los
// clientes sin RFC no identifican a un cliente concreto, así que esos se agrupan por cliente.
const RFC_GENERICOS = new Set(['XAXX010101000', 'XEXX010101000']);
export function claveReciboCliente(rfc: string | null | undefined, id_cliente_alm: string): string {
    const r = (rfc ?? '').trim().toUpperCase();
    return r && !RFC_GENERICOS.has(r) ? `RFC:${r}` : `CLI:${id_cliente_alm}`;
}

// `mismoRfc`: el recibo junta cuentas de varios clientes con el mismo RFC (ya validado por quien llama)
async function _capturarReciboEnTx(data: ICapturarPagoCliente, prefijo: string, t: Transaction, mismoRfc = false) {
    // El consecutivo se genera DENTRO de la transacción, con un advisory
    // lock por prefijo (ver getSiguienteConsecutivoAgente) — si se genera
    // afuera, dos capturas simultáneas pueden leer el mismo MAX() y terminar
    // compartiendo numero_recibo entre clientes distintos (pasó en producción:
    // "FRF_11855" con 2 clientes).
    const consecutivo   = await Pago_CxCRepository.getSiguienteConsecutivoAgente(prefijo, t);
    const numero_recibo = data.numero_recibo_custom?.trim()
        ? data.numero_recibo_custom.trim()
        : `${prefijo}_${String(consecutivo).padStart(4, '0')}`;

    const pagosCreados = [];

    for (const abono of data.abonos) {
        const cxc = await CxCRepository.getById(abono.id_cxc);
        if (!cxc) throw new Error(`CxC ${abono.id_cxc} no encontrada`);
        if (!mismoRfc && cxc.id_cliente_alm !== data.id_cliente_alm)
            throw new Error(`La CxC ${abono.id_cxc} no pertenece al cliente indicado`);
        if (cxc.estatus_cxc === 'PAG')
            throw new Error(`La CxC ${abono.id_cxc} ya está pagada`);
        if (cxc.estatus_cxc === 'CAN')
            throw new Error(`La CxC ${abono.id_cxc} está cancelada`);
        if (abono.monto_abono <= 0)
            throw new Error(`El monto del abono a CxC ${abono.id_cxc} debe ser mayor a 0`);

        // Saldo disponible = saldo_pendiente − pagos CAP ya registrados (aún no aplicados)
        const capExistente = ((await Pago_CxC.sum('monto_pago', {
            where: { id_cxc: abono.id_cxc, estatus_pago: 'CAP' },
            transaction: t,
        })) as number) || 0;
        const saldoDisponible = Number(cxc.saldo_pendiente) - capExistente;
        if (abono.monto_abono > saldoDisponible)
            throw new Error(
                `El abono ($${abono.monto_abono.toFixed(2)}) excede el saldo disponible ` +
                `($${saldoDisponible.toFixed(2)}) de la CxC ${abono.id_cxc}` +
                (capExistente > 0 ? ` — ya hay $${capExistente.toFixed(2)} en revisión para esta cuenta` : '')
            );

        const pago = await Pago_CxCRepository.capturar({
            id_cxc: abono.id_cxc,
            numero_recibo,
            id_metodo_pago: data.id_metodo_pago,
            id_forma_pago: data.id_forma_pago,
            monto_pago: abono.monto_abono,
            fecha_pago: data.fecha_deposito as any,
            referencia_pago: data.referencia_pago,
            id_banco: data.id_banco,
            id_empleado_captura: data.id_empleado_captura,
            notas: data.notas,
        }, t);

        pagosCreados.push(pago);
    }

    return { numero_recibo, pagosCreados };
}

// Nota: el prorrateo de IVA por tasa vive ahora en
// Facturas/helpers/factura.helper.ts (calcularImpuestosProporcionalesPago),
// compartido con Facturacion.service.ts — ver import arriba (aliased como
// _impuestosProporcionalesPago para no tocar las llamadas existentes).

// ─────────────────────────────────────────────────────────────────────────────
//  Helper privado — genera .txt de Complemento de Pago para un FacturaPagoCFDI
// ─────────────────────────────────────────────────────────────────────────────
async function _generarTxtUno(cfdi: FacturaPagoCFDI, id_empresa?: string): Promise<{
    ok: boolean; ruta_txt?: string; error?: string;
}> {
    try {
        // Leer valores via dataValues para evitar el problema de class fields que tapan getters
        const d = cfdi.dataValues ?? cfdi;
        const id_pago_cfdi   = d.id_pago_cfdi;
        const id_factura     = d.id_factura;
        const fecha_pago     = d.fecha_pago;
        const forma_de_pago  = d.forma_de_pago;
        const moneda         = d.moneda ?? 'MXN';
        const monto_pagado   = Number(d.monto_pagado);
        const saldo_anterior = Number(d.saldo_anterior);
        const num_parcialidad = d.num_parcialidad;
        const uuid_relacionado = d.uuid_relacionado;
        const pagoCxc = d.id_pago_cxc ? await Pago_CxC.findByPk(d.id_pago_cxc) : null;
        const numero_recibo = (pagoCxc?.dataValues ?? pagoCxc as any)?.numero_recibo ?? null;

        if (!id_pago_cfdi) return { ok: false, error: 'Registro sin PK — ignorado' };
        if (!fecha_pago)   return { ok: false, error: 'Fecha de pago inválida' };

        const fechaStr = new Date(fecha_pago).toISOString().split('T')[0];
        if (fechaStr === 'Invalid') return { ok: false, error: 'Fecha de pago inválida' };

        const factura = await Facturas.findByPk(id_factura);
        const cliente = factura ? await Cliente_Almacen.findByPk(factura.id_cliente_alm) : null;
        const emisor  = await _getEmisor(id_empresa);
        if (!emisor) throw new Error('No se encontró la empresa emisora');

        let zip = '00000';
        if (cliente?.id_colonia_cliente_alm) {
            const colonia = await Colonia.findByPk(cliente.id_colonia_cliente_alm);
            const coloniaData = colonia?.dataValues ?? colonia;
            if ((coloniaData as any)?.cp_colonia) zip = (coloniaData as any).cp_colonia;
        }

        const series = derivarSeries(emisor.serie_ingreso);
        const folio  = await FacturacionRepository.getSiguienteFolio();

        // Registrar en facturas para reservar el folio y que el siguiente pago obtenga uno diferente.
        // id_factura_origen es lo que permite a regenerar-txt-pago encontrar de vuelta el
        // FacturaPagoCFDI — sin esto queda huérfana y el botón "TXT" siempre da 404.
        await Facturas.create({
            tipo_cfdi:         'P',
            origen_factura:    'CXC',
            folio_factura:     String(folio),
            fecha_emision:     new Date(fecha_pago),
            subtotal_factura:  monto_pagado,
            iva_factura:       0,
            total_factura:     monto_pagado,
            // PEN hasta que el XmlWatcher lea el XML timbrado; ahí pasa a TIM con su UUID
            estatus_factura:   'PEN',
            id_cliente_alm:    (factura?.dataValues ?? factura as any)?.id_cliente_alm ?? null,
            id_factura_origen: id_factura,
            uuid_relacionado:  (factura?.dataValues ?? factura as any)?.uuid_sat ?? null,
            numero_recibo,
        });

        const receptor: ReceptorTxt = {
            razon_social:    ((cliente?.dataValues ?? cliente as any)?.razon_social_cliente_alm ?? '').toUpperCase(),
            rfc:             (cliente?.dataValues ?? cliente as any)?.rfc_cliente_alm ?? 'XAXX010101000',
            domicilio_fiscal: zip,
            regimen_fiscal:  (cliente?.dataValues ?? cliente as any)?.id_regimen_fiscal_cliente_alm ?? '616',
            uso_cfdi:        'CP01',
        };

        const facturaData    = factura?.dataValues ?? factura as any;
        const saldo_insoluto = Math.max(saldo_anterior - monto_pagado, 0);

        // Base/impuesto proporcionales al pago, por cada tasa real de la factura
        const total_fact    = Number(facturaData?.total_factura    ?? 0);
        const subtotal_fact = Number(facturaData?.subtotal_factura ?? 0);
        const iva_fact      = Number(facturaData?.iva_factura      ?? 0);
        const impuestos     = await _impuestosProporcionalesPago(id_factura, monto_pagado, total_fact, subtotal_fact, iva_fact);

        const { ruta } = generarTxtPago({
            emisor, receptor, folio,
            fecha_pago:       fechaStr,
            id_forma_pago:    forma_de_pago,
            moneda,
            num_cuenta_banco: (emisor as any).num_cuenta_banco ?? undefined,
            rfc_cta_ben:      (emisor as any).rfc_banco ?? undefined,
            documentos: [{
                uuid_relacionado: facturaData?.uuid_sat ?? uuid_relacionado ?? '',
                folio_factura:    facturaData?.folio_factura ?? String(folio),
                serie_factura:    emisor.serie_ingreso,
                monto_pago:       monto_pagado,
                saldo_anterior,
                saldo_insoluto,
                num_parcialidad,
                moneda,
                impuestos,
            }],
            nombreArchivo: `PagoDig${series.pago}${folio}-Pagos.txt`,
        });

        // El watcher de XMLs es quien pone TIM cuando llegue el XML timbrado
        return { ok: true, ruta_txt: ruta };
    } catch (err: any) {
        const pk = (cfdi.dataValues ?? cfdi as any).id_pago_cfdi;
        console.error(`[CxC] Error al generar .txt id_pago_cfdi=${pk}:`, err.message, err.stack);
        if (pk) {
            await FacturaPagoCFDI.update(
                { estatus_timbrado: 'ERR' },
                { where: { id_pago_cfdi: pk } }
            ).catch(() => { });
        }
        return { ok: false, error: err.message ?? 'Error desconocido' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper privado — genera UN .txt por recibo con todos sus documentos (DP1, DP2…)
// ─────────────────────────────────────────────────────────────────────────────
async function _generarTxtRecibo(cfdis: FacturaPagoCFDI[], id_empresa?: string): Promise<{
    ok: boolean; ruta_txt?: string; error?: string;
}> {
    if (cfdis.length === 0) return { ok: false, error: 'Sin registros para generar' };

    try {
        // Leer datos del primer CFDI para encabezado del pago (fecha, forma, moneda son iguales en el recibo)
        const d0 = cfdis[0].dataValues ?? (cfdis[0] as any);
        const fecha_pago    = d0.fecha_pago;
        const forma_de_pago = d0.forma_de_pago;
        const moneda        = d0.moneda ?? 'MXN';
        const pagoCxc0      = d0.id_pago_cxc ? await Pago_CxC.findByPk(d0.id_pago_cxc) : null;
        const numero_recibo = (pagoCxc0?.dataValues ?? pagoCxc0 as any)?.numero_recibo ?? null;

        if (!fecha_pago) return { ok: false, error: 'Fecha de pago inválida' };
        const fechaStr = new Date(fecha_pago).toISOString().split('T')[0];

        const emisor = await _getEmisor(id_empresa);
        if (!emisor) throw new Error('No se encontró la empresa emisora');

        // Obtener datos del cliente del primer CFDI (todos del recibo son del mismo cliente)
        const factura0 = d0.id_factura ? await Facturas.findByPk(d0.id_factura) : null;
        const clienteId = (factura0?.dataValues ?? factura0 as any)?.id_cliente_alm;
        const cliente   = clienteId ? await Cliente_Almacen.findByPk(clienteId) : null;
        const clienteD  = cliente?.dataValues ?? (cliente as any);

        let zip = '00000';
        if (clienteD?.id_colonia_cliente_alm) {
            const colonia = await Colonia.findByPk(clienteD.id_colonia_cliente_alm);
            const coloniaD = colonia?.dataValues ?? (colonia as any);
            if (coloniaD?.cp_colonia) zip = coloniaD.cp_colonia;
        }

        const receptor: ReceptorTxt = {
            razon_social:     (clienteD?.razon_social_cliente_alm ?? '').toUpperCase(),
            rfc:              clienteD?.rfc_cliente_alm ?? 'XAXX010101000',
            domicilio_fiscal: zip,
            regimen_fiscal:   clienteD?.id_regimen_fiscal_cliente_alm ?? '616',
            uso_cfdi:         'CP01',
        };

        // Construir array de documentos (uno por CFDI del recibo)
        const documentos: DocumentoPagoTxt[] = [];
        for (const cfdi of cfdis) {
            const d        = cfdi.dataValues ?? (cfdi as any);
            const fact     = d.id_factura ? await Facturas.findByPk(d.id_factura) : null;
            const factD    = fact?.dataValues ?? (fact as any);
            const monto_pago    = Number(d.monto_pagado);
            const total_fact    = Number(factD?.total_factura    ?? 0);
            const subtotal_fact = Number(factD?.subtotal_factura ?? 0);
            const iva_fact      = Number(factD?.iva_factura      ?? 0);
            const impuestos     = await _impuestosProporcionalesPago(d.id_factura, monto_pago, total_fact, subtotal_fact, iva_fact);
            documentos.push({
                uuid_relacionado: factD?.uuid_sat ?? d.uuid_relacionado ?? '',
                folio_factura:    factD?.folio_factura ?? '',
                serie_factura:    emisor.serie_ingreso,
                monto_pago,
                saldo_anterior:   Number(d.saldo_anterior),
                saldo_insoluto:   Math.max(Number(d.saldo_anterior) - monto_pago, 0),
                num_parcialidad:  d.num_parcialidad,
                moneda,
                impuestos,
            });
        }

        const folio  = await FacturacionRepository.getSiguienteFolio();
        const series = derivarSeries(emisor.serie_ingreso);

        // Reservar folio en facturas (un solo registro por recibo).
        // OJO: un recibo puede cubrir VARIAS facturas — id_factura_origen solo
        // admite una. Se guarda la primera como referencia (para que "TXT" en
        // el listado no truene con 404), pero regenerar-txt-pago para un
        // recibo multi-factura solo podrá reconstruir ese primer documento;
        // los demás quedan huérfanos de esa función mientras factura_pago_cfdi
        // no tenga su propio FK a esta fila (ver comentario en Factura_Pago_CFDI.model.ts).
        const primerCfdi = cfdis[0]?.dataValues ?? (cfdis[0] as any);
        await Facturas.create({
            tipo_cfdi:         'P',
            origen_factura:    'CXC',
            folio_factura:     String(folio),
            fecha_emision:     new Date(fecha_pago),
            subtotal_factura:  documentos.reduce((s, d) => s + d.monto_pago, 0),
            iva_factura:       0,
            total_factura:     documentos.reduce((s, d) => s + d.monto_pago, 0),
            // PEN hasta que el XmlWatcher lea el XML timbrado; ahí pasa a TIM con su UUID
            estatus_factura:   'PEN',
            id_cliente_alm:    clienteId ?? null,
            id_factura_origen: primerCfdi?.id_factura ?? null,
            uuid_relacionado:  documentos[0]?.uuid_relacionado ?? null,
            numero_recibo,
        });

        const { ruta } = generarTxtPago({
            emisor, receptor, folio,
            fecha_pago:       fechaStr,
            id_forma_pago:    forma_de_pago,
            moneda,
            num_cuenta_banco: (emisor as any).num_cuenta_banco ?? undefined,
            rfc_cta_ben:      (emisor as any).rfc_banco ?? undefined,
            documentos,
            nombreArchivo: `PagoDig${series.pago}${folio}-Pagos.txt`,
        });

        // El watcher de XMLs es quien pone TIM cuando llegue el XML timbrado
        return { ok: true, ruta_txt: ruta };

    } catch (err: any) {
        console.error('[CxC] Error al generar .txt recibo:', err.message, err.stack);
        for (const cfdi of cfdis) {
            const pk = (cfdi.dataValues ?? cfdi as any).id_pago_cfdi;
            if (pk) await FacturaPagoCFDI.update({ estatus_timbrado: 'ERR' }, { where: { id_pago_cfdi: pk } }).catch(() => { });
        }
        return { ok: false, error: err.message ?? 'Error desconocido' };
    }
}

export const CxCService = {

    getAll: async (filtros?: { estatus?: string; fecha_inicio?: string; fecha_fin?: string; cliente?: string; agente?: string; page?: number; limit?: number }) => CxCRepository.getAll(filtros),

    getClientesDeudores: async (id_empleado: string) => {
        const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
        if (!agente) throw new Error('No se encontró un agente de venta asociado a este usuario');
        return CxCRepository.getClientesDeudores(agente.id_agente);
    },

    getByCliente: async (id_cliente_alm: string) => CxCRepository.getByCliente(id_cliente_alm),

    getVencidas: async () => CxCRepository.getVencidas(),

    getById: async (id_cxc: string) => {
        const cxc = await CxCRepository.getById(id_cxc);
        if (!cxc) throw new Error('CxC no encontrada');
        const pagos = await Pago_CxCRepository.getByIdCxC(id_cxc);
        return { cxc, pagos };
    },

    // Pagos capturados que el encargado de pagos tiene pendientes de aplicar
    getPagosParaAplicar: async () => {
        return await Pago_CxCRepository.getPendientesDeAplicar();
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 1 — CAPTURAR PAGO
    //  Cualquier empleado registra el pago → queda en estatus CAP
    //  No toca el saldo de la CxC todavía
    // ─────────────────────────────────────────────────────────────────────────
    capturarPago: async (data: ICapturarPago) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });
        try {
            const cxc = await CxCRepository.getById(data.id_cxc);
            if (!cxc) throw new Error('CxC no encontrada');
            if (cxc.estatus_cxc === 'PAG') throw new Error('Esta cuenta ya fue pagada');
            if (cxc.estatus_cxc === 'CAN') throw new Error('Esta cuenta está cancelada');
            // Saldo disponible = saldo_pendiente − pagos CAP ya registrados (aún no aplicados)
            const capExistente1 = ((await Pago_CxC.sum('monto_pago', {
                where: { id_cxc: data.id_cxc, estatus_pago: 'CAP' },
                transaction: t,
            })) as number) || 0;
            const saldoDisponible1 = Number(cxc.saldo_pendiente) - capExistente1;
            if (data.monto_pago > saldoDisponible1)
                throw new Error(
                    `El monto ($${data.monto_pago.toFixed(2)}) excede el saldo disponible ($${saldoDisponible1.toFixed(2)})` +
                    (capExistente1 > 0 ? ` — ya hay $${capExistente1.toFixed(2)} en revisión para esta cuenta` : '')
                );

            const pago = await Pago_CxCRepository.capturar(data, t);

            await t.commit();
            return pago;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PAGO POR RECIBO (multi-CxC)
    //  Registra un número de recibo físico con abonos a varias CxC del mismo
    //  cliente en una sola transacción. Cada abono queda en estatus CAP.
    // ─────────────────────────────────────────────────────────────────────────
    capturarPagoCliente: async (data: ICapturarPagoCliente) => {
        if (!data.abonos || data.abonos.length === 0) {
            throw new Error('Debe incluir al menos un abono en el recibo');
        }

        // ── Resolver agente ───────────────────────────────────────────────────────
        const agente = await AgenteRepository.getByIdEmpleado(data.id_empleado_captura);
        if (!agente) throw new Error('El empleado capturista no tiene un agente de venta asociado');

        // Si el agente escribió el folio de un recibo físico, el prefijo lo pone el backend con las
        // iniciales YA resueltas arriba (nunca las que el navegador haya podido calcular/cargar).
        const datosConFolio = data.numero_recibo_sufijo?.trim()
            ? { ...data, numero_recibo_custom: `${agente.cod_identi_agente}_${data.numero_recibo_sufijo.trim()}` }
            : data;

        // ── Transacción ───────────────────────────────────────────────────────────
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            const { numero_recibo, pagosCreados } = await _capturarReciboEnTx(datosConFolio, agente.cod_identi_agente, t);

            await t.commit();

            return {
                ok: true,
                numero_recibo,
                total_abonado: data.abonos.reduce((s, a) => s + a.monto_abono, 0),
                pagos_creados: pagosCreados.length,
                pagos: pagosCreados,
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  RECIBOS DESDE UNA SELECCIÓN DE CxC (pantalla Cuentas por Cobrar del ERP)
    //  Datos frescos de cada cuenta seleccionada + lo que ya está "en revisión"
    //  (pagos CAP sin aplicar), para saber cuánto se puede abonar todavía.
    // ─────────────────────────────────────────────────────────────────────────
    getCuentasParaRecibo: async (ids_cxc: string[]) => {
        if (!ids_cxc.length) return [];
        const rows = await dbLocal.query<{
            id_cxc: string; id_cliente_alm: string; estatus_cxc: string;
            saldo_pendiente: string; en_revision: string; folio: string | null;
            razon_social: string; nom_corto: string | null; rfc: string | null;
        }>(`
            SELECT cxc.id_cxc, cxc.id_cliente_alm, cxc.estatus_cxc, cxc.saldo_pendiente,
                   COALESCE(f.folio_factura::text, r.folio_remision::text) AS folio,
                   ca.razon_social_cliente_alm AS razon_social,
                   ca.nom_corto_cliente_alm    AS nom_corto,
                   ca.rfc_cliente_alm          AS rfc,
                   COALESCE((
                       SELECT SUM(p.monto_pago) FROM pago_cxc p
                       WHERE p.id_cxc = cxc.id_cxc AND p.estatus_pago = 'CAP'
                   ), 0) AS en_revision
            FROM cuenta_por_cobrar cxc
            JOIN cliente_almacen ca ON ca.id_cliente_alm = cxc.id_cliente_alm
            LEFT JOIN facturas   f ON f.id_factura  = cxc.id_factura
            LEFT JOIN remision   r ON r.id_remision = cxc.id_remision
            WHERE cxc.id_cxc IN (:ids)
            ORDER BY ca.razon_social_cliente_alm, cxc.fecha_vencimiento
        `, { replacements: { ids: ids_cxc }, type: QueryTypes.SELECT });

        return rows.map(r => {
            const saldo = Number(r.saldo_pendiente);
            const enRevision = Number(r.en_revision);
            return {
                id_cxc: r.id_cxc,
                id_cliente_alm: r.id_cliente_alm,
                estatus_cxc: r.estatus_cxc,
                folio: r.folio,
                cliente: { razon_social: r.razon_social, nom_corto: r.nom_corto, rfc: r.rfc },
                saldo_pendiente: saldo,
                en_revision: enRevision,
                disponible: Math.max(0, +(saldo - enRevision).toFixed(2)),
            };
        });
    },

    // Crea un recibo por cada cliente de la selección, todos en UNA transacción:
    // o se crean todos o no se crea ninguno. Cada abono queda en CAP (pendiente de
    // aplicar); al aplicarlo el encargado se genera el CFDI de pago y su .txt.
    capturarRecibosPorSeleccion: async (data: {
        id_empleado_captura: string;
        fecha_deposito: string;
        id_metodo_pago: string;
        id_forma_pago: string;
        referencia_pago?: string;
        id_banco?: string | null;
        notas?: string;
        numero_recibo_custom?: string;
        abonos: { id_cxc: string; monto_abono: number }[];
    }) => {
        if (!data.abonos?.length) throw new Error('Debe incluir al menos un abono en el recibo');
        if (!data.fecha_deposito) throw new Error('La fecha del depósito es obligatoria');
        if (!data.id_forma_pago) throw new Error('La forma de pago es obligatoria');
        // Cheque (02) y transferencia (03) llevan siempre su banco
        if (['02', '03'].includes(data.id_forma_pago) && !data.id_banco) {
            throw new Error(data.id_forma_pago === '02' ? 'Selecciona el banco del cheque.' : 'Selecciona el banco de la transferencia.');
        }
        const id_banco = ['02', '03'].includes(data.id_forma_pago) ? (data.id_banco || undefined) : undefined;

        const ids = data.abonos.map(a => a.id_cxc);
        if (new Set(ids).size !== ids.length) throw new Error('Hay cuentas repetidas en la selección');

        // Validación amigable de toda la selección, antes de tocar nada
        const cuentas = await CxCService.getCuentasParaRecibo(ids);
        const porId = new Map(cuentas.map(c => [c.id_cxc, c]));
        const fmt = (n: number) => `$${n.toFixed(2)}`;
        const problemas: string[] = [];
        for (const a of data.abonos) {
            const c = porId.get(a.id_cxc);
            if (!c) { problemas.push(`Una de las cuentas ya no existe (${a.id_cxc})`); continue; }
            const etiqueta = `Folio ${c.folio ?? '—'} (${c.cliente.nom_corto ?? c.cliente.razon_social})`;
            if (c.estatus_cxc === 'PAG') problemas.push(`${etiqueta}: ya está pagada`);
            else if (c.estatus_cxc === 'CAN') problemas.push(`${etiqueta}: está cancelada`);
            else if (!(Number(a.monto_abono) > 0)) problemas.push(`${etiqueta}: el abono debe ser mayor a 0`);
            else if (Number(a.monto_abono) > c.disponible + 0.001)
                problemas.push(
                    `${etiqueta}: el abono ${fmt(Number(a.monto_abono))} excede lo disponible ${fmt(c.disponible)}` +
                    (c.en_revision > 0 ? ` (ya hay ${fmt(c.en_revision)} en revisión)` : '')
                );
        }
        if (problemas.length) throw new Error(`No se pudo generar el recibo:\n• ${problemas.join('\n• ')}`);

        // Un recibo por RFC (varias cuentas/sucursales con el mismo RFC van juntas en un solo recibo)
        const porCliente = new Map<string, { abonos: { id_cxc: string; monto_abono: number }[]; id_cliente_alm: string }>();
        for (const a of data.abonos) {
            const c = porId.get(a.id_cxc)!;
            const clave = claveReciboCliente(c.cliente.rfc, c.id_cliente_alm);
            if (!porCliente.has(clave)) porCliente.set(clave, { abonos: [], id_cliente_alm: c.id_cliente_alm });
            porCliente.get(clave)!.abonos.push({ id_cxc: a.id_cxc, monto_abono: Number(a.monto_abono) });
        }
        if (data.numero_recibo_custom?.trim() && porCliente.size > 1) {
            throw new Error('Un número de recibo propio solo se puede usar cuando la selección es de un solo cliente.');
        }

        // Prefijo del folio: el código de agente si el usuario es agente; si no, "ERP"
        const agente = await AgenteRepository.getByIdEmpleado(data.id_empleado_captura);
        const prefijo = agente?.cod_identi_agente || 'ERP';

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            const recibos: {
                numero_recibo: string; id_cliente_alm: string; cliente: string;
                total_abonado: number; pagos_creados: number;
            }[] = [];

            for (const [, grupo] of porCliente) {
                const id_cliente_alm = grupo.id_cliente_alm;
                const { numero_recibo, pagosCreados } = await _capturarReciboEnTx({
                    id_cliente_alm,
                    numero_recibo_custom: data.numero_recibo_custom,
                    fecha_deposito: data.fecha_deposito,
                    id_metodo_pago: data.id_metodo_pago,
                    id_forma_pago: data.id_forma_pago,
                    referencia_pago: data.referencia_pago,
                    id_banco,
                    id_empleado_captura: data.id_empleado_captura,
                    notas: data.notas,
                    abonos: grupo.abonos,
                }, prefijo, t, true);

                const ref = porId.get(grupo.abonos[0].id_cxc)!;
                recibos.push({
                    numero_recibo,
                    id_cliente_alm,
                    cliente: ref.cliente.nom_corto ?? ref.cliente.razon_social,
                    total_abonado: grupo.abonos.reduce((s, a) => s + a.monto_abono, 0),
                    pagos_creados: pagosCreados.length,
                });
            }

            await t.commit();
            return {
                ok: true,
                recibos,
                total_abonado: recibos.reduce((s, r) => s + r.total_abonado, 0),
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 2 — APLICAR PAGO (encargado de pagos)
    //  1. Marca el pago como APL
    //  2. Actualiza saldo de la CxC
    //  3. Sincroniza estatus de la Remisión (si aplica)
    //  4. Crea Factura_Pago_CFDI con estatus PEN
    //  5. Timbra automáticamente con Facturapi (fuera de la transacción DB)
    //     Si el SAT falla → CFDI queda ERR, el pago sigue aplicado (no se revierte)
    // ─────────────────────────────────────────────────────────────────────────
    aplicarPago: async (data: IAplicarPago) => {
        // ── Obtener el pago y validarlo ───────────────────────────────────────
        const pago = await Pago_CxCRepository.getById(data.id_pago_cxc);
        if (!pago) throw new Error('Pago no encontrado');
        if (pago.estatus_pago === 'APL') throw new Error('Este pago ya fue aplicado');
        if (pago.estatus_pago === 'CAN') throw new Error('Este pago está cancelado');

        const cxc = await CxCRepository.getById(pago.id_cxc);
        if (!cxc) throw new Error('CxC no encontrada');
        if (cxc.estatus_cxc === 'PAG') throw new Error('Esta CxC ya está pagada');

        // Guardar saldo_anterior ANTES de aplicar
        const saldo_anterior = Number(cxc.saldo_pendiente);

        // ── Resolver la Factura tipo I asociada ───────────────────────────────
        // Público General ya no crea Factura al vender — remisionRow.id_factura solo
        // sigue lleno en remisiones viejas (de antes de este cambio) que aún esperan
        // su timbrado con el flujo anterior (una sola factura al liquidarse el total).
        let id_factura_ref: string | null = cxc.id_factura ?? null;
        let remisionRow: Remision | null = null;
        if (!id_factura_ref && cxc.id_remision) {
            remisionRow = await Remision.findByPk(cxc.id_remision);
            if (remisionRow?.id_factura) id_factura_ref = remisionRow.id_factura;
        }
        const factura = id_factura_ref ? await Facturas.findByPk(id_factura_ref) : null;

        // ── Número de parcialidad: cuántos pagos APL tiene esta CxC ya ────────
        const num_parcialidad = (await Pago_CxC.count({
            where: { id_cxc: pago.id_cxc, estatus_pago: 'APL' }
        })) + 1;

        // ── Transacción DB ────────────────────────────────────────────────────
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            // 1. Marcar pago como APL
            await Pago_CxCRepository.marcarAplicado(data.id_pago_cxc, data.id_empleado_aplica, t);

            // 2. Actualizar saldo CxC
            const cxcActualizada = await CxCRepository.aplicarPago(pago.id_cxc, Number(pago.monto_pago), t);

            // 3. Sincronizar estatus Remisión (si aplica)
            if (cxc.id_remision) {
                const nuevoEstatus =
                    cxcActualizada.estatus_cxc === 'PAG' ? 'LIQ' :
                        cxcActualizada.estatus_cxc === 'PAR' ? 'PAR' : 'PEN';
                await RemisionRepository.actualizarEstatus(cxc.id_remision, nuevoEstatus, t);
            }

            // 4. Crear Factura_Pago_CFDI solo si la factura tiene UUID SAT (ya timbrada)
            //    y el método de pago es PPD (PUE no requiere complemento de pago SAT;
            //    la factura se emitió como "ya pagada" aunque internamente sea crédito).
            let cfdiCreado: FacturaPagoCFDI | null = null;
            if (factura?.uuid_sat && factura?.id_metodo_pago !== 'PUE') {
                const saldo_insoluto = Math.max(saldo_anterior - Number(pago.monto_pago), 0);

                cfdiCreado = await FacturaPagoCFDI.create({
                    id_pago_cfdi: uuidv4(),   // generamos explícitamente — @Default no siempre actúa en el INSERT
                    id_factura: factura.id_factura,
                    id_pago_cxc: pago.id_pago_cxc,
                    fecha_pago: pago.fecha_pago,
                    forma_de_pago: pago.id_forma_pago,
                    moneda: 'MXN',
                    monto_pagado: pago.monto_pago,
                    num_parcialidad,
                    saldo_anterior,
                    saldo_insoluto,
                    uuid_relacionado: factura.uuid_sat,
                    uuid_cfdi_pago: null,
                    pdf_url: null,
                    xml_url: null,
                    estatus_timbrado: 'PEN',
                }, { transaction: t });
            }

            await t.commit();

            // 5. Generar .txt (fuera de la transacción)
            let timbrado: { ok: boolean; ruta_txt?: string; error?: string } | null = null;
            if (cfdiCreado) {
                timbrado = await _generarTxtUno(cfdiCreado);
            }

            // 6. Público General: cada abono genera su propia Factura de Ingreso, prorateada
            //    contra el total de la venta — no se espera a que el CxC quede liquidado.
            //    (Compatibilidad: si esta remisión ya traía una Factura pre-creada de antes
            //    de este cambio, se sigue timbrando con el flujo anterior solo al liquidarse.)
            let timbradoPublicoGeneral: { ok: boolean; ruta_txt?: string; error?: string; folio?: number } | null = null;
            if (cxc.id_remision) {
                if (factura) {
                    if (cxcActualizada.estatus_cxc === 'PAG') {
                        timbradoPublicoGeneral = await timbrarIngresoPublicoGeneral(factura.id_factura);
                    }
                } else if (remisionRow) {
                    timbradoPublicoGeneral = await generarFacturaAbonoPublicoGeneral({
                        id_pedido_alm: remisionRow.id_pedido_alm,
                        id_cliente_alm: cxc.id_cliente_alm,
                        monto_total_venta: Number(cxc.monto_total),
                        monto_pago: Number(pago.monto_pago),
                        id_forma_pago: pago.id_forma_pago,
                        folio_remision: remisionRow.folio_remision,
                    });
                }
                if (timbradoPublicoGeneral?.ok) {
                    console.log(`[aplicarPago] Factura Público General generada (folio ${timbradoPublicoGeneral.folio ?? '—'}): ${timbradoPublicoGeneral.ruta_txt}`);
                } else if (timbradoPublicoGeneral) {
                    console.warn(`[aplicarPago] No se pudo generar la factura de Público General: ${timbradoPublicoGeneral.error}`);
                }
            }

            const mensajeTimbrado = cxc.id_remision
                ? (timbradoPublicoGeneral
                    ? (timbradoPublicoGeneral.ok
                        ? `Pago aplicado. Factura de Público General generada (folio ${timbradoPublicoGeneral.folio ?? '—'}): ${timbradoPublicoGeneral.ruta_txt}`
                        : `Pago aplicado. Error generando la factura de Público General: ${timbradoPublicoGeneral.error}`)
                    : 'Pago aplicado.')
                : !factura
                    ? 'Pago aplicado. No hay factura asociada, no se genera complemento de pago.'
                    : factura.id_metodo_pago === 'PUE'
                        ? 'Pago aplicado. La factura es PUE — no se genera complemento de pago.'
                        : !factura.uuid_sat
                            ? 'Pago aplicado. La factura no tiene UUID SAT — el .txt se generará cuando se capture el UUID.'
                            : timbrado?.ok
                                ? `Pago aplicado y .txt de complemento de pago generado: ${timbrado.ruta_txt}`
                                : `Pago aplicado. Generación de .txt falló: ${timbrado?.error}`;

            return { ok: true, mensaje: mensajeTimbrado, timbrado, timbradoPublicoGeneral };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // ─── APLICAR RECIBO COMPLETO (1 timbre para todos los pagos del recibo) ────
    aplicarRecibo: async (numero_recibo: string, id_empleado_aplica: string | null) => {
        const pagosRecibo = await Pago_CxCRepository.getByNumeroRecibo(numero_recibo);
        if (!pagosRecibo || pagosRecibo.length === 0)
            throw new Error('No se encontraron pagos para este recibo');

        const pendientes = pagosRecibo.filter((p: any) => p.estatus_pago === 'CAP');
        if (pendientes.length === 0)
            throw new Error('Todos los pagos de este recibo ya fueron aplicados o cancelados');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        const cfdisCreados: FacturaPagoCFDI[] = [];
        // Facturas "viejas" (pre-creadas antes de este cambio) que con este recibo quedaron liquidadas
        const facturasPublicoGeneralViejas = new Set<string>();
        // Abonos nuevos de Público General: cada uno genera su propia Factura prorateada
        const abonosPublicoGeneralNuevos: {
            id_pedido_alm: string; id_cliente_alm: string;
            monto_total_venta: number; monto_pago: number;
            id_forma_pago: string; folio_remision: number;
        }[] = [];

        try {
            for (const pago of pendientes) {
                const cxc = await CxCRepository.getById(pago.id_cxc);
                if (!cxc || cxc.estatus_cxc === 'PAG') continue;

                const saldo_anterior = Number(cxc.saldo_pendiente);

                // Resolver factura (id_factura_ref solo sigue lleno en remisiones viejas)
                let id_factura_ref: string | null = cxc.id_factura ?? null;
                let remisionRow: Remision | null = null;
                if (!id_factura_ref && cxc.id_remision) {
                    remisionRow = await Remision.findByPk(cxc.id_remision);
                    if (remisionRow?.id_factura) id_factura_ref = remisionRow.id_factura;
                }
                const factura = id_factura_ref ? await Facturas.findByPk(id_factura_ref) : null;

                const num_parcialidad = (await Pago_CxC.count({
                    where: { id_cxc: pago.id_cxc, estatus_pago: 'APL' },
                })) + 1;

                // Marcar APL y actualizar saldo
                await Pago_CxCRepository.marcarAplicado(pago.id_pago_cxc, id_empleado_aplica, t);
                const cxcActualizada = await CxCRepository.aplicarPago(pago.id_cxc, Number(pago.monto_pago), t);

                if (cxc.id_remision) {
                    const nuevoEstatus =
                        cxcActualizada.estatus_cxc === 'PAG' ? 'LIQ' :
                        cxcActualizada.estatus_cxc === 'PAR' ? 'PAR' : 'PEN';
                    await RemisionRepository.actualizarEstatus(cxc.id_remision, nuevoEstatus, t);

                    if (factura) {
                        // Compatibilidad: remisión vieja con Factura pre-creada — se timbra
                        // con el flujo anterior solo cuando se liquida por completo.
                        if (cxcActualizada.estatus_cxc === 'PAG') facturasPublicoGeneralViejas.add(factura.id_factura);
                    } else if (remisionRow) {
                        // Público General nuevo: este abono genera su propia Factura,
                        // prorateada — sin esperar a que se liquide el total.
                        abonosPublicoGeneralNuevos.push({
                            id_pedido_alm: remisionRow.id_pedido_alm,
                            id_cliente_alm: cxc.id_cliente_alm,
                            monto_total_venta: Number(cxc.monto_total),
                            monto_pago: Number(pago.monto_pago),
                            id_forma_pago: pago.id_forma_pago,
                            folio_remision: remisionRow.folio_remision,
                        });
                    }
                }

                // Crear registro CFDI pendiente solo si la factura está timbrada y es PPD
                if (factura?.uuid_sat && factura?.id_metodo_pago !== 'PUE') {
                    const saldo_insoluto = Math.max(saldo_anterior - Number(pago.monto_pago), 0);
                    const cfdi = await FacturaPagoCFDI.create({
                        id_pago_cfdi: uuidv4(),
                        id_factura: factura.id_factura,
                        id_pago_cxc: pago.id_pago_cxc,
                        fecha_pago: pago.fecha_pago,
                        forma_de_pago: pago.id_forma_pago,
                        moneda: 'MXN',
                        monto_pagado: pago.monto_pago,
                        num_parcialidad,
                        saldo_anterior,
                        saldo_insoluto,
                        uuid_relacionado: factura.uuid_sat,
                        uuid_cfdi_pago: null,
                        pdf_url: null,
                        xml_url: null,
                        estatus_timbrado: 'PEN',
                    }, { transaction: t });
                    cfdisCreados.push(cfdi);
                }
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // Generar .txt por cada CFDI fuera de transacción
        let timbrado = null;
        if (cfdisCreados.length > 0) {
            timbrado = await _generarTxtRecibo(cfdisCreados);
        }

        // Facturas de Público General: viejas (liquidadas, flujo anterior) + abonos
        // nuevos (cada uno con su propia Factura prorateada)
        const ingresosPublicoGeneral: { id_factura: string | null; ok: boolean; ruta_txt?: string; error?: string; folio?: number }[] = [];
        for (const id_factura of facturasPublicoGeneralViejas) {
            const r = await timbrarIngresoPublicoGeneral(id_factura);
            ingresosPublicoGeneral.push({ id_factura, ...r });
            if (!r.ok) console.warn(`[aplicarRecibo] No se pudo generar TXT Público General (${id_factura}): ${r.error}`);
        }
        for (const abono of abonosPublicoGeneralNuevos) {
            const r = await generarFacturaAbonoPublicoGeneral(abono);
            ingresosPublicoGeneral.push({ id_factura: r.id_factura ?? null, ...r });
            if (!r.ok) console.warn(`[aplicarRecibo] No se pudo generar la factura de Público General: ${r.error}`);
        }
        const pgOk  = ingresosPublicoGeneral.filter(x => x.ok).length;
        const pgErr = ingresosPublicoGeneral.length - pgOk;
        const sufijoPG = ingresosPublicoGeneral.length === 0 ? '' :
            ` ${pgOk} factura(s) de Público General generada(s) como ingreso` +
            (pgErr > 0 ? ` y ${pgErr} con error (reintenta con ↺ en Facturas)` : '') + '.';

        return {
            ok: true,
            pagos_aplicados: pendientes.length,
            cfdis_generados: cfdisCreados.length,
            timbrado,
            ingresos_publico_general: ingresosPublicoGeneral,
            mensaje: (cfdisCreados.length === 0
                ? `${pendientes.length} pago(s) aplicados. Sin facturas PPD — no se genera complemento.`
                : timbrado?.ok
                    ? `${pendientes.length} pago(s) aplicados y ${cfdisCreados.length} .txt de pago generados.`
                    : `${pendientes.length} pago(s) aplicados. Generación de .txt falló: ${timbrado?.error}`) + sufijoPG,
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  TIMBRAR PAGOS PENDIENTES (reintento en lote para ERR/PEN que fallaron)
    //  Normalmente el timbrado ocurre automáticamente al aplicar el pago.
    //  Este endpoint sirve para reintentar los que quedaron en ERR o PEN.
    // ─────────────────────────────────────────────────────────────────────────
    timbrarPagosPendientes: async () => {
        const { Op } = await import('sequelize');

        // Limpiar registros con PK null que quedaron de intentos previos con bug de UUID
        await FacturaPagoCFDI.destroy({
            where: { id_pago_cfdi: null } as any,
        }).catch(() => { });

        const pendientes = await FacturaPagoCFDI.findAll({
            where: {
                estatus_timbrado: { [Op.in]: ['PEN', 'ERR'] },
                id_pago_cfdi: { [Op.ne]: null },
                fecha_pago:   { [Op.ne]: null },
            },
        });

        if (!pendientes.length) {
            return { ok: true, mensaje: 'No hay pagos pendientes de timbrar.', timbrados: 0, errores: 0, total: 0, detalle: [] };
        }

        // Agrupar por id_pago_cxc (recibo) — CFDIs sin recibo van individualmente
        const grupos = new Map<string, FacturaPagoCFDI[]>();
        for (const cfdi of pendientes) {
            const d   = cfdi.dataValues ?? (cfdi as any);
            const key = d.id_pago_cxc ?? `_solo_${d.id_pago_cfdi}`;
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key)!.push(cfdi);
        }

        const detalle: Array<{ recibo: string; estatus: 'TIM' | 'ERR'; ruta_txt?: string; error?: string }> = [];
        let timbrados = 0;
        let errores   = 0;

        for (const [key, grupo] of grupos) {
            const resultado = await _generarTxtRecibo(grupo);
            if (resultado.ok) {
                timbrados++;
                detalle.push({ recibo: key, estatus: 'TIM', ruta_txt: resultado.ruta_txt });
            } else {
                errores++;
                detalle.push({ recibo: key, estatus: 'ERR', error: resultado.error });
            }
        }

        return { ok: errores === 0, timbrados, errores, total: grupos.size, detalle };
    },

    marcarVencidas: async () => CxCRepository.marcarVencidas(),

    // ─────────────────────────────────────────────────────────────────────────
    //  RESUMEN GENERAL — Dashboard de cartera
    // ─────────────────────────────────────────────────────────────────────────
    getResumenGeneral: async () => CxCRepository.getResumenGeneral(),

    // ─────────────────────────────────────────────────────────────────────────
    //  ESTADO DE CUENTA — Detalle completo por cliente
    //  ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD (opcionales)
    // ─────────────────────────────────────────────────────────────────────────
    getEstadoCuenta: async (id_cliente_alm: string, filtros?: { fecha_inicio?: string; fecha_fin?: string }) => {
        return CxCRepository.getEstadoCuenta(id_cliente_alm, filtros);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  ANTIGÜEDAD DE SALDOS — Reporte global o por cliente
    //  Clasifica saldos en: corriente | 1-30 | 31-60 | 61-90 | +90 días
    // ─────────────────────────────────────────────────────────────────────────
    getAntiguedadSaldos: async (id_cliente_alm?: string) => {
        return CxCRepository.getAntiguedadSaldos(id_cliente_alm);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  HISTORIAL PAGOS DE UNA CxC — incluyendo links CFDI
    // ─────────────────────────────────────────────────────────────────────────
    getHistorialCxC: async (id_cxc: string) => {
        const cxc = await CxCRepository.getById(id_cxc);
        if (!cxc) throw new Error('CxC no encontrada');
        const pagos = await Pago_CxCRepository.getHistorialCxC(id_cxc);
        // Enriquecer cada pago con su CFDI (si existe)
        const pagosConCfdi = await Promise.all(pagos.map(async pago => {
            const cfdi = await FacturaPagoCFDI.findOne({ where: { id_pago_cxc: pago.id_pago_cxc } });
            return {
                ...pago.toJSON(),
                cfdi: cfdi ?? null,
            };
        }));
        return { cxc, pagos: pagosConCfdi };
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  CFDI POR TIMBRAR — lista FacturaPagoCFDI con estatus PEN o ERR
    //  Incluye factura original y forma de pago para la pantalla del ERP
    // ─────────────────────────────────────────────────────────────────────────
    getCFDIPorTimbrar: async () => {
        const { Op } = await import('sequelize');
        return await FacturaPagoCFDI.findAll({
            where: { estatus_timbrado: { [Op.in]: ['PEN', 'ERR'] } },
            include: [
                {
                    model: Facturas,
                    attributes: ['id_factura', 'folio_factura', 'uuid_sat', 'total_factura'],
                },
                {
                    model: Cat_Forma_De_Pago,
                    attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  EDITAR PAGO — solo si está en estatus CAP
    //  Valida que el nuevo monto no exceda el saldo pendiente de la CxC
    // ─────────────────────────────────────────────────────────────────────────
    editarPago: async (id_pago_cxc: string, campos: {
        monto_pago?: number;
        fecha_pago?: string;
        id_forma_pago?: string;
        id_metodo_pago?: string;
        referencia_pago?: string | null;
        notas?: string | null;
        numero_recibo?: string;
    }) => {
        const pago = await Pago_CxCRepository.getById(id_pago_cxc);
        if (!pago) throw new Error('Pago no encontrado');
        if (pago.estatus_pago !== 'CAP') throw new Error('Solo se pueden editar pagos en estatus CAP');

        if (campos.monto_pago !== undefined) {
            const cxc = await CxCRepository.getById(pago.id_cxc);
            if (!cxc) throw new Error('CxC no encontrada');
            // CAP no modifica saldo_pendiente → el tope es el saldo real de la CxC
            if (campos.monto_pago <= 0)
                throw new Error('El monto debe ser mayor a 0');
            // Al editar: saldo disponible = saldo_pendiente − otros CAP de la misma CxC (excluye este pago)
            const capOtros = ((await Pago_CxC.sum('monto_pago', {
                where: { id_cxc: pago.id_cxc, estatus_pago: 'CAP', id_pago_cxc: { [Op.ne]: id_pago_cxc } },
            })) as number) || 0;
            const saldoDispEditar = Number(cxc.saldo_pendiente) - capOtros;
            if (campos.monto_pago > saldoDispEditar)
                throw new Error(
                    `El monto ($${campos.monto_pago.toFixed(2)}) excede el saldo disponible ($${saldoDispEditar.toFixed(2)})` +
                    (capOtros > 0 ? ` — otros pagos en revisión: $${capOtros.toFixed(2)}` : '')
                );
        }

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            const actualizado = await Pago_CxCRepository.editar(id_pago_cxc, campos, t);
            await t.commit();
            return actualizado;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PAGOS APLICADOS — todos los APL con fecha_vencimiento de CxC incluida
    //  Usado por el frontend para calcular comisiones de agentes en tiempo real.
    //  ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD  (opcionales)
    // ─────────────────────────────────────────────────────────────────────────
    getPagosAplicados: async (filtros?: { fecha_inicio?: string; fecha_fin?: string }) => {
        return await Pago_CxCRepository.getPagosAplicados(filtros);
    },

    // TODOS los recibos (por aplicar, aplicados o cancelados) de un rango de fechas
    getPagosPorRango: async (filtros: { fecha_inicio?: string; fecha_fin?: string }) => {
        return await Pago_CxCRepository.getPagosPorRango(filtros);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PAGOS APL SIN CFDI DE PAGO — para timbrado manual desde el ERP
    // ─────────────────────────────────────────────────────────────────────────
    getPagosAplicadosSinCFDI: async () => {
        return await Pago_CxCRepository.getPagosAplicadosSinCFDI();
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  TIMBRAR MANUAL — crea FacturaPagoCFDI retroactivamente y timbra
    //  uuid_sat_manual: si la factura en BD no tiene uuid_sat, el usuario
    //  lo provee manualmente (lo guardamos en la factura y en el CFDI)
    // ─────────────────────────────────────────────────────────────────────────
    timbrarManual: async (id_pago_cxc: string, uuid_sat_manual?: string) => {
        const pago = await Pago_CxCRepository.getById(id_pago_cxc);
        if (!pago) throw new Error('Pago no encontrado');
        if (pago.estatus_pago !== 'APL') throw new Error('Solo se pueden timbrar pagos ya aplicados');

        // Verificar que no tenga ya un CFDI
        const cfdiExistente = await FacturaPagoCFDI.findOne({ where: { id_pago_cxc } });
        if (cfdiExistente) throw new Error('Este pago ya tiene un CFDI de pago generado');

        // Resolver factura
        const cxc = await CxCRepository.getById(pago.id_cxc);
        if (!cxc) throw new Error('CxC no encontrada');

        let id_factura_ref: string | null = cxc.id_factura ?? null;
        if (!id_factura_ref && cxc.id_remision) {
            const remision = await Remision.findByPk(cxc.id_remision);
            if (remision?.id_factura) id_factura_ref = remision.id_factura;
        }
        if (!id_factura_ref) throw new Error('Esta CxC no tiene una factura asociada');

        const factura = await Facturas.findByPk(id_factura_ref);
        if (!factura) throw new Error('Factura no encontrada');

        // Las facturas PUE no requieren complemento de pago SAT
        if (factura.id_metodo_pago === 'PUE') {
            throw new Error('Esta factura tiene método de pago PUE — no requiere complemento de pago SAT.');
        }

        // Si la factura no tiene uuid_sat pero el usuario lo proveyó, lo guardamos
        const uuid_sat_final = factura.uuid_sat || uuid_sat_manual || null;
        if (!uuid_sat_final) throw new Error('La factura no tiene UUID SAT. Proporciona el UUID SAT para poder timbrar.');

        if (!factura.uuid_sat && uuid_sat_manual) {
            await factura.update({ uuid_sat: uuid_sat_manual });
        }

        // Calcular saldo_anterior retroactivamente:
        // Sumamos todos los pagos APL para esta CxC CON fecha_aplicado <= este pago (ordenados)
        const pagosAnteriores = await Pago_CxC.findAll({
            where: {
                id_cxc: pago.id_cxc,
                estatus_pago: 'APL',
                fecha_aplicado: { $lte: pago.fecha_aplicado } as any,
            } as any,
            order: [['fecha_aplicado', 'ASC']],
        });

        // El saldo_anterior de este pago = monto_total - suma de APL anteriores a él
        const idxEste = pagosAnteriores.findIndex(p => p.id_pago_cxc === id_pago_cxc);
        const sumAnteriores = pagosAnteriores
            .slice(0, idxEste)
            .reduce((s, p) => s + Number(p.monto_pago), 0);

        const saldo_anterior = Number(cxc.monto_total) - sumAnteriores;
        const saldo_insoluto = Math.max(saldo_anterior - Number(pago.monto_pago), 0);
        const num_parcialidad = idxEste + 1;

        // Crear FacturaPagoCFDI
        const cfdiCreado = await FacturaPagoCFDI.create({
            id_pago_cfdi: uuidv4(),
            id_factura: factura.id_factura,
            id_pago_cxc: pago.id_pago_cxc,
            fecha_pago: pago.fecha_pago,
            forma_de_pago: pago.id_forma_pago,
            moneda: 'MXN',
            monto_pagado: pago.monto_pago,
            num_parcialidad,
            saldo_anterior,
            saldo_insoluto,
            uuid_relacionado: uuid_sat_final,
            uuid_cfdi_pago: null,
            pdf_url: null,
            xml_url: null,
            estatus_timbrado: 'PEN',
        });

        // Generar .txt
        const timbrado = await _generarTxtUno(cfdiCreado);
        return {
            ok: timbrado.ok,
            mensaje: timbrado.ok
                ? `Complemento de pago generado: ${timbrado.ruta_txt}`
                : `CFDI creado pero la generación de .txt falló: ${timbrado.error}`,
            timbrado,
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  MIS RECIBOS — pagos registrados por un empleado (vista agente en web)
    // ─────────────────────────────────────────────────────────────────────────
    getMisRecibos: async (id_empleado_captura: string) => {
        return await Pago_CxCRepository.getMisRecibos(id_empleado_captura);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  RECIBO DE COBRANZA PDF
    //  Genera el PDF a partir del numero_recibo, agrupando todos los pagos
    //  (que no estén cancelados) que comparten ese número de recibo.
    // ─────────────────────────────────────────────────────────────────────────
    generarReciboPDF: async (numero_recibo: string): Promise<Buffer> => {
        const datos = await Pago_CxCRepository.getDatosRecibo(numero_recibo);
        if (!datos) throw new Error(`Recibo ${numero_recibo} no encontrado`);
        return generarReciboPDFBuffer(datos);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  CANCELAR PAGO — Solo si estatus es CAP (no aplicado aún)
    // ─────────────────────────────────────────────────────────────────────────
    cancelarPago: async (id_pago_cxc: string) => {
        const pago = await Pago_CxCRepository.getById(id_pago_cxc);
        if (!pago) throw new Error('Pago no encontrado');
        if (pago.estatus_pago === 'APL') throw new Error('No se puede cancelar un pago ya aplicado');
        if (pago.estatus_pago === 'CAN') throw new Error('El pago ya está cancelado');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            const pagoCancelado = await Pago_CxCRepository.cancelar(id_pago_cxc, t);
            await t.commit();
            return pagoCancelado;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // Cancela TODOS los pagos (aún no aplicados) de un recibo en una sola operación.
    // Un recibo puede abonar varias facturas/remisiones a la vez; cancelarlo cancela
    // el recibo completo, nunca solo uno de sus documentos.
    cancelarRecibo: async (numero_recibo: string) => {
        const pagosRecibo = await Pago_CxCRepository.getByNumeroRecibo(numero_recibo);
        if (!pagosRecibo || pagosRecibo.length === 0)
            throw new Error('No se encontraron pagos para este recibo');

        const pendientes = pagosRecibo.filter((p: any) => p.estatus_pago === 'CAP');
        if (pendientes.length === 0)
            throw new Error('Todos los pagos de este recibo ya fueron aplicados o cancelados');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            for (const pago of pendientes) {
                await Pago_CxCRepository.cancelar(pago.id_pago_cxc, t);
            }
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        return { ok: true, pagos_cancelados: pendientes.length };
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  DESHACER RECIBO YA APLICADO — acción destructiva, requiere admin.
    //  A cada CxC que este recibo pagó le regresa el monto (vuelve a deberse), y si
    //  estaba ligada a una remisión le regresa su estatus. Los pagos quedan CAN.
    //  El complemento de pago (factura tipo P) de este recibo también queda CAN —
    //  la factura de venta original NO se toca, solo el pago que se le hizo.
    //  Si ese complemento ya estaba timbrado ante el SAT, cancelarlo ahí es aparte
    //  (este sistema no timbra/cancela directo con el PAC, solo genera el .txt).
    // ─────────────────────────────────────────────────────────────────────────
    cancelarReciboAplicado: async (
        numero_recibo: string,
        opts: { usuario_admin?: string; password_admin?: string; id_empleado?: string } = {},
    ) => {
        if (!opts.usuario_admin || !opts.password_admin) {
            throw new Error('Se requieren credenciales de administrador para deshacer un recibo ya aplicado.');
        }
        const autorizador = await verificarAdmin(opts.usuario_admin, opts.password_admin);

        const pagosRecibo = await Pago_CxCRepository.getByNumeroRecibo(numero_recibo);
        if (!pagosRecibo || pagosRecibo.length === 0) throw new Error('No se encontraron pagos para este recibo');

        const aplicados = pagosRecibo.filter((p: any) => p.estatus_pago === 'APL');
        if (aplicados.length === 0) throw new Error('Este recibo no tiene pagos aplicados que deshacer.');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            for (const pago of aplicados) {
                const cxcActualizada = await CxCRepository.revertirPago(pago.id_cxc, Number(pago.monto_pago), t);

                if (cxcActualizada.id_remision) {
                    const nuevoEstatusRem =
                        cxcActualizada.estatus_cxc === 'PAG' ? 'LIQ' :
                            cxcActualizada.estatus_cxc === 'PAR' ? 'PAR' : 'PEN';
                    await RemisionRepository.actualizarEstatus(cxcActualizada.id_remision, nuevoEstatusRem, t);
                }

                await Pago_CxC.update(
                    {
                        estatus_pago: 'CAN',
                        notas: `${pago.notas ? pago.notas + ' — ' : ''}Recibo aplicado deshecho por ${autorizador.usuario}`,
                    },
                    { where: { id_pago_cxc: pago.id_pago_cxc }, transaction: t },
                );
            }

            // El/los complemento(s) de pago (factura tipo P) de este recibo quedan cancelados.
            // La factura de venta original (tipo I) no se toca — solo se deshace el pago.
            const [, complementosCancelados] = await Facturas.update(
                { estatus_factura: 'CAN' },
                { where: { tipo_cfdi: 'P', numero_recibo, estatus_factura: { [Op.ne]: 'CAN' } }, transaction: t, returning: true },
            );
            const teniaTimbrado = (complementosCancelados as any[])?.some(f => !!f.uuid_sat) ?? false;

            await t.commit();

            console.warn(`[cancelarReciboAplicado] Recibo ${numero_recibo}: ${aplicados.length} pago(s) deshechos por ${autorizador.usuario}`);
            return {
                ok: true,
                pagos_revertidos: aplicados.length,
                monto_revertido: aplicados.reduce((s, p: any) => s + Number(p.monto_pago), 0),
                complementos_cancelados: (complementosCancelados as any[])?.length ?? 0,
                aviso_sat: teniaTimbrado
                    ? 'Al menos un complemento de pago ya estaba timbrado ante el SAT — cancélalo también ahí con tu facturador; aquí solo quedó cancelado en el sistema.'
                    : null,
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    getSaldoHistorico: async (id_cliente_alm: string, fecha_corte: string) => {
        return await CxCRepository.getSaldoHistorico(id_cliente_alm, fecha_corte);
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  REGENERAR TXT — Vuelve a escribir el archivo TXT de un pago ya existente
    //  sin consumir un nuevo folio ni crear nuevos registros.
    //  Recibe el id de la fila "P" en `facturas` (el folio reservado del
    //  complemento de pago) y reconstruye TODOS los documentos que cubrió:
    //    1) Caso normal (1 factura pagada): usa id_factura_origen directo.
    //    2) Caso recibo multi-factura (_generarTxtRecibo): id_factura_origen
    //       no alcanza para representar varias facturas, así que se buscan
    //       todos los factura_pago_cfdi del mismo cliente creados junto con
    //       esta fila P cuya suma cuadre con su total.
    // ─────────────────────────────────────────────────────────────────────────
    regenerarTxtPagoCFDI: async (id_factura_p: string, id_empresa?: string) => {
        const facturaP = await Facturas.findByPk(id_factura_p);
        if (!facturaP) throw new Error('Factura no encontrada');
        const fp = facturaP.dataValues ?? (facturaP as any);
        if (fp.tipo_cfdi !== 'P') throw new Error('La factura indicada no es un complemento de pago');

        // Resolver qué factura_pago_cfdi corresponden a esta fila P (1 documento,
        // o el grupo completo de un recibo multi-factura) — lógica compartida con
        // Facturacion.repository.ts (detalle de factura en el listado).
        const grupo = await resolverGrupoPagoP({
            id_factura:        fp.id_factura,
            id_factura_origen: fp.id_factura_origen,
            id_cliente_alm:    fp.id_cliente_alm,
            total_factura:     Number(fp.total_factura),
            numero_recibo:     fp.numero_recibo,
        });
        if (!grupo.length) throw new Error('Complemento de pago no encontrado');

        const cfdis = await FacturaPagoCFDI.findAll({ where: { id_pago_cfdi: grupo.map(g => g.id_pago_cfdi) } });
        if (!cfdis.length) throw new Error('Complemento de pago no encontrado');

        const primerCfdi = cfdis[0].dataValues ?? (cfdis[0] as any);
        const primeraFacturaOrigen = await Facturas.findByPk(primerCfdi.id_factura);
        const foPrimera = primeraFacturaOrigen?.dataValues ?? (primeraFacturaOrigen as any);
        const cliente = foPrimera ? await Cliente_Almacen.findByPk(foPrimera.id_cliente_alm) : null;
        const emisor  = await _getEmisor(id_empresa);
        if (!emisor) throw new Error('No se encontró la empresa emisora');

        let zip = '00000';
        if ((cliente?.dataValues ?? cliente as any)?.id_colonia_cliente_alm) {
            const colonia = await Colonia.findByPk((cliente?.dataValues ?? cliente as any).id_colonia_cliente_alm);
            const coloniaData = colonia?.dataValues ?? colonia;
            if ((coloniaData as any)?.cp_colonia) zip = (coloniaData as any).cp_colonia;
        }

        const receptor: ReceptorTxt = {
            razon_social:     ((cliente?.dataValues ?? cliente as any)?.razon_social_cliente_alm ?? '').toUpperCase(),
            rfc:              (cliente?.dataValues ?? cliente as any)?.rfc_cliente_alm ?? 'XAXX010101000',
            domicilio_fiscal: zip,
            regimen_fiscal:   (cliente?.dataValues ?? cliente as any)?.id_regimen_fiscal_cliente_alm ?? '616',
            uso_cfdi:         'CP01',
        };

        const series   = derivarSeries(emisor.serie_ingreso);
        const folio    = Number(fp.folio_factura); // ← folio PROPIO de esta fila P, no el de la(s) factura(s) pagada(s)
        const fechaStr = new Date(primerCfdi.fecha_pago).toISOString().split('T')[0];

        const documentos: DocumentoPagoTxt[] = [];
        for (const cfdiRow of cfdis) {
            const d = cfdiRow.dataValues ?? (cfdiRow as any);
            const facturaOrigen = await Facturas.findByPk(d.id_factura);
            const fo = facturaOrigen?.dataValues ?? (facturaOrigen as any);
            const monto_pago = Number(d.monto_pagado);
            const impuestos  = await _impuestosProporcionalesPago(
                d.id_factura, monto_pago,
                Number(fo?.total_factura ?? 0), Number(fo?.subtotal_factura ?? 0), Number(fo?.iva_factura ?? 0),
            );
            documentos.push({
                uuid_relacionado: fo?.uuid_sat ?? d.uuid_relacionado ?? '',
                folio_factura:    fo?.folio_factura ?? '',
                serie_factura:    emisor.serie_ingreso,
                monto_pago,
                saldo_anterior:   Number(d.saldo_anterior),
                saldo_insoluto:   Math.max(Number(d.saldo_anterior) - monto_pago, 0),
                num_parcialidad:  d.num_parcialidad,
                moneda:           d.moneda ?? 'MXN',
                impuestos,
            });
        }

        const { ruta, contenido } = generarTxtPago({
            emisor, receptor, folio,
            fecha_pago:       fechaStr,
            id_forma_pago:    primerCfdi.forma_de_pago,
            moneda:           primerCfdi.moneda ?? 'MXN',
            num_cuenta_banco: (emisor as any).num_cuenta_banco ?? undefined,
            rfc_cta_ben:      (emisor as any).rfc_banco ?? undefined,
            documentos,
            nombreArchivo: `PagoDig${series.pago}${folio}-Pagos.txt`,
        });

        // Limpiar UUID y regresar a PEN (todos los documentos del recibo) para que el watcher procese el nuevo XML
        await FacturaPagoCFDI.update(
            { uuid_cfdi_pago: null, estatus_timbrado: 'PEN', xml_url: null, pdf_url: null, fecha_timbrado: null },
            { where: { id_pago_cfdi: cfdis.map(c => (c.dataValues ?? c).id_pago_cfdi) } }
        );

        // Limpiar también la fila "P" (wrapper) — si no, se queda con el uuid_sat
        // viejo (o sin ninguno) y el watcher nunca la vuelve a tomar en el próximo timbrado.
        await Facturas.update(
            { uuid_sat: null, fecha_timbrado: null, xml_url: null, pdf_url: null, estatus_factura: 'PEN' },
            { where: { id_factura: id_factura_p } }
        );

        return { ruta, contenido };
    },
};
