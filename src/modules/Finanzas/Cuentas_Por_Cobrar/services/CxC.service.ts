import { Transaction } from 'sequelize';
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
import { facturapiClient } from '../../../../helpers/facturapi.helper';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
//  Helper privado — timbra un solo FacturaPagoCFDI con Facturapi
//  Se llama FUERA de transacción DB para no revertir la aplicación si el SAT falla
// ─────────────────────────────────────────────────────────────────────────────
async function _timbrarUno(cfdi: FacturaPagoCFDI): Promise<{
    ok: boolean; uuid?: string; pdf_url?: string; xml_url?: string; error?: string;
}> {
    try {
        const factura = await Facturas.findByPk(cfdi.id_factura);
        if (!factura?.uuid_sat) {
            throw new Error('Factura sin UUID SAT — no se puede timbrar el complemento');
        }

        const cliente = await Cliente_Almacen.findByPk(factura.id_cliente_alm);
        let zip = '00000';
        if (cliente?.id_colonia_cliente_alm) {
            const colonia = await Colonia.findByPk(cliente.id_colonia_cliente_alm);
            if (colonia?.cp_colonia) zip = colonia.cp_colonia;
        }

        const complement = await facturapiClient.invoices.create({
            type: 'P',
            customer: {
                legal_name: cliente?.razon_social_cliente_alm ?? '',
                tax_id: cliente?.rfc_cliente_alm ?? '',
                tax_system: cliente?.id_regimen_fiscal_cliente_alm ?? '',
                address: { zip },
            },
            payments: [{
                date: new Date(cfdi.fecha_pago),
                form: cfdi.forma_de_pago,
                amount: Number(cfdi.monto_pagado),
                currency: 'MXN',
                exchange: 1,
                related_documents: [{
                    uuid: factura.uuid_sat,
                    amount: Number(cfdi.monto_pagado),
                    installment: cfdi.num_parcialidad,
                    last_balance: Number(cfdi.saldo_anterior),
                    currency: 'MXN',
                }],
            }],
        } as any);

        const uuid_cfdi = (complement as any)?.uuid ?? null;
        const pdf_url = (complement as any)?.pdf_url ?? null;
        const xml_url = (complement as any)?.xml_url ?? null;

        await FacturaPagoCFDI.update({
            uuid_cfdi_pago: uuid_cfdi,
            pdf_url,
            xml_url,
            estatus_timbrado: uuid_cfdi ? 'TIM' : 'ERR',
        }, { where: { id_pago_cfdi: cfdi.id_pago_cfdi } });

        if (!uuid_cfdi) return { ok: false, error: 'Facturapi no devolvió UUID' };
        return { ok: true, uuid: uuid_cfdi, pdf_url, xml_url };

    } catch (err: any) {
        console.error(`[CxC] Error al timbrar id_pago_cfdi=${cfdi.id_pago_cfdi}:`, err);
        await FacturaPagoCFDI.update(
            { estatus_timbrado: 'ERR' },
            { where: { id_pago_cfdi: cfdi.id_pago_cfdi } }
        ).catch(() => { });
        return { ok: false, error: err.message ?? 'Error desconocido' };
    }
}

export const CxCService = {

    getAll: async () => CxCRepository.getAll(),

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
            if (data.monto_pago > Number(cxc.saldo_pendiente))
                throw new Error(`El monto (${data.monto_pago}) excede el saldo pendiente (${cxc.saldo_pendiente})`);

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

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            const pagosCreados = [];

            for (const abono of data.abonos) {
                const cxc = await CxCRepository.getById(abono.id_cxc);
                if (!cxc) throw new Error(`CxC ${abono.id_cxc} no encontrada`);
                if (cxc.id_cliente_alm !== data.id_cliente_alm)
                    throw new Error(`La CxC ${abono.id_cxc} no pertenece al cliente indicado`);
                if (cxc.estatus_cxc === 'PAG')
                    throw new Error(`La CxC ${abono.id_cxc} ya está pagada`);
                if (cxc.estatus_cxc === 'CAN')
                    throw new Error(`La CxC ${abono.id_cxc} está cancelada`);
                if (abono.monto_abono <= 0)
                    throw new Error(`El monto del abono a CxC ${abono.id_cxc} debe ser mayor a 0`);
                if (abono.monto_abono > Number(cxc.saldo_pendiente))
                    throw new Error(
                        `El abono ($${abono.monto_abono}) excede el saldo pendiente ($${cxc.saldo_pendiente}) de la CxC ${abono.id_cxc}`
                    );

                const pago = await Pago_CxCRepository.capturar({
                    id_cxc: abono.id_cxc,
                    numero_recibo: data.numero_recibo,
                    id_metodo_pago: data.id_metodo_pago,
                    id_forma_pago: data.id_forma_pago,
                    monto_pago: abono.monto_abono,
                    fecha_pago: data.fecha_deposito as any,
                    referencia_pago: data.referencia_pago,
                    id_empleado_captura: data.id_empleado_captura,
                    notas: data.notas,
                }, t);

                pagosCreados.push(pago);
            }

            await t.commit();

            return {
                ok: true,
                numero_recibo: data.numero_recibo,
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
        let id_factura_ref: string | null = cxc.id_factura ?? null;
        if (!id_factura_ref && cxc.id_remision) {
            const remision = await Remision.findByPk(cxc.id_remision);
            if (remision) id_factura_ref = remision.id_factura;
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

            // 4. Crear Factura_Pago_CFDI solo si la factura tiene UUID SAT (ya fue timbrada)
            //    Sin uuid_sat no hay complemento de pago posible
            let cfdiCreado: FacturaPagoCFDI | null = null;
            if (factura?.uuid_sat) {
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

            // 5. Timbrar automáticamente (fuera de la transacción para no revertir el pago si el SAT falla)
            let timbrado: { ok: boolean; uuid?: string; pdf_url?: string; xml_url?: string; error?: string } | null = null;
            if (cfdiCreado) {
                timbrado = await _timbrarUno(cfdiCreado);
            }

            const mensajeTimbrado = !factura
                ? 'Pago aplicado. No hay factura asociada, no se genera CFDI de pago.'
                : !factura.uuid_sat
                    ? 'Pago aplicado. La factura aún no está timbrada en el SAT, no se puede generar complemento de pago.'
                    : timbrado?.ok
                        ? 'Pago aplicado y complemento de pago timbrado correctamente.'
                        : `Pago aplicado. El timbrado falló: ${timbrado?.error}`;

            return { ok: true, mensaje: mensajeTimbrado, timbrado };

        } catch (error) {
            await t.rollback();
            throw error;
        }
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
            where: { estatus_timbrado: { [Op.in]: ['PEN', 'ERR'] } },
        });

        if (!pendientes.length) {
            return { ok: true, mensaje: 'No hay pagos pendientes de timbrar.', timbrados: 0, errores: 0, total: 0, detalle: [] };
        }

        const detalle: Array<{ id_pago_cfdi: string; estatus: 'TIM' | 'ERR'; uuid?: string; error?: string }> = [];
        let timbrados = 0;
        let errores = 0;

        for (const cfdi of pendientes) {
            const resultado = await _timbrarUno(cfdi);
            if (resultado.ok) {
                timbrados++;
                detalle.push({ id_pago_cfdi: cfdi.id_pago_cfdi, estatus: 'TIM', uuid: resultado.uuid });
            } else {
                errores++;
                detalle.push({ id_pago_cfdi: cfdi.id_pago_cfdi, estatus: 'ERR', error: resultado.error });
            }
        }

        return { ok: errores === 0, timbrados, errores, total: pendientes.length, detalle };
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
            if (campos.monto_pago > Number(cxc.saldo_pendiente))
                throw new Error(`El monto (${campos.monto_pago}) excede el saldo pendiente (${Number(cxc.saldo_pendiente).toFixed(2)})`);
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

        // Timbrar
        const timbrado = await _timbrarUno(cfdiCreado);
        return {
            ok: timbrado.ok,
            mensaje: timbrado.ok
                ? 'CFDI de pago generado y timbrado correctamente.'
                : `CFDI creado pero el timbrado falló: ${timbrado.error}`,
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
};
