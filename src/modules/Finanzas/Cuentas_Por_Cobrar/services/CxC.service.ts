import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICapturarPago, IAplicarPago } from '../interface/CxC.interface';
import { CxCRepository } from '../repositories/CxC.repository';
import { Pago_CxCRepository } from '../repositories/Pago_CxC.repository';
import { RemisionRepository } from '../../Remisiones/repositories/Remision.repository';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Facturas from '../../../Facturas/model/Facturas.model';
import Remision from '../../Remisiones/model/Remision.model';
import Colonia from '../../../../models/Ubicacion/Colonia';
import Pago_CxC from '../model/Pago_CxC.model';
import FacturaPagoCFDI from '../../../Facturas/model/Factura_Pago_CFDI.model';
import { facturapiClient } from '../../../../helpers/facturapi.helper';

export const CxCService = {

    getAll: async () => CxCRepository.getAll(),

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
            if (!cxc)                        throw new Error('CxC no encontrada');
            if (cxc.estatus_cxc === 'PAG')  throw new Error('Esta cuenta ya fue pagada');
            if (cxc.estatus_cxc === 'CAN')  throw new Error('Esta cuenta está cancelada');
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
    //  PASO 2 — APLICAR PAGO (encargado de pagos)
    //  1. Marca el pago como APL
    //  2. Actualiza saldo de la CxC
    //  3. Sincroniza estatus de la Remisión (si aplica)
    //  4. Crea Factura_Pago_CFDI con estatus PEN → listo para timbrar en lote
    //
    //  ⚠️  El timbrado con Facturapi NO ocurre aquí.
    //      Usar el endpoint POST /timbrar-pagos para timbrar todos los PEN.
    // ─────────────────────────────────────────────────────────────────────────
    aplicarPago: async (data: IAplicarPago) => {
        // ── Obtener el pago y validarlo ───────────────────────────────────────
        const pago = await Pago_CxCRepository.getById(data.id_pago_cxc);
        if (!pago)                         throw new Error('Pago no encontrado');
        if (pago.estatus_pago === 'APL')  throw new Error('Este pago ya fue aplicado');
        if (pago.estatus_pago === 'CAN')  throw new Error('Este pago está cancelado');

        const cxc = await CxCRepository.getById(pago.id_cxc);
        if (!cxc)                         throw new Error('CxC no encontrada');
        if (cxc.estatus_cxc === 'PAG')   throw new Error('Esta CxC ya está pagada');

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

            // 4. Crear Factura_Pago_CFDI en PEN (lista para timbrar en lote)
            if (factura) {
                const saldo_insoluto = Math.max(saldo_anterior - Number(pago.monto_pago), 0);

                await FacturaPagoCFDI.create({
                    id_factura:       factura.id_factura,
                    id_pago_cxc:      pago.id_pago_cxc,
                    fecha_pago:       pago.fecha_pago,
                    forma_de_pago:    pago.id_forma_pago,
                    moneda:           'MXN',
                    monto_pagado:     pago.monto_pago,
                    num_parcialidad,
                    saldo_anterior,
                    saldo_insoluto,
                    uuid_relacionado: factura.uuid_sat ?? '',
                    uuid_cfdi_pago:   null,
                    pdf_url:          null,
                    xml_url:          null,
                    estatus_timbrado: 'PEN',
                }, { transaction: t });
            }

            await t.commit();

            return {
                ok: true,
                mensaje: 'Pago aplicado correctamente. Listo para timbrar.',
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  TIMBRAR PAGOS PENDIENTES (proceso en lote)
    //  Agarra todos los Factura_Pago_CFDI en estatus PEN y los timbra
    //  con Facturapi uno por uno. Devuelve un resumen con éxitos y errores.
    // ─────────────────────────────────────────────────────────────────────────
    timbrarPagosPendientes: async () => {
        // Obtener todos los CFDI de pago pendientes de timbrar
        const pendientes = await FacturaPagoCFDI.findAll({
            where: { estatus_timbrado: 'PEN' },
            include: [
                { model: Facturas, as: 'factura' },
            ],
        });

        if (!pendientes.length) {
            return { ok: true, mensaje: 'No hay pagos pendientes de timbrar.', timbrados: 0, errores: 0, detalle: [] };
        }

        const detalle: Array<{
            id_pago_cfdi: string;
            estatus: 'TIM' | 'ERR';
            uuid?: string;
            error?: string;
        }> = [];

        let timbrados = 0;
        let errores   = 0;

        for (const cfdi of pendientes) {
            try {
                const factura = (cfdi as any).factura as Facturas | null
                    ?? await Facturas.findByPk(cfdi.id_factura);

                if (!factura || !factura.uuid_sat) {
                    throw new Error('Factura sin UUID SAT — no se puede timbrar el complemento');
                }

                // Obtener datos del cliente para el receptor del CFDI
                const cliente = await Cliente_Almacen.findByPk(factura.id_cliente_alm);
                let zip = '00000';
                if (cliente?.id_colonia_cliente_alm) {
                    const colonia = await Colonia.findByPk(cliente.id_colonia_cliente_alm);
                    if (colonia?.cp_colonia) zip = colonia.cp_colonia;
                }

                // Llamada a Facturapi — Complemento de Pago tipo P
                const complement = await facturapiClient.invoices.create({
                    type: 'P',
                    customer: {
                        legal_name: cliente?.razon_social_cliente_alm ?? '',
                        tax_id:     cliente?.rfc_cliente_alm ?? '',
                        tax_system: cliente?.id_regimen_fiscal_cliente_alm ?? '',
                        address:    { zip },
                    },
                    payments: [{
                        date:     new Date(cfdi.fecha_pago),
                        form:     cfdi.forma_de_pago,
                        amount:   Number(cfdi.monto_pagado),
                        currency: 'MXN',
                        exchange: 1,
                        related_documents: [{
                            uuid:         factura.uuid_sat,
                            amount:       Number(cfdi.monto_pagado),
                            installment:  cfdi.num_parcialidad,
                            last_balance: Number(cfdi.saldo_anterior),
                            currency:     'MXN',
                        }],
                    }],
                } as any);

                const uuid_cfdi = (complement as any)?.uuid ?? null;

                await FacturaPagoCFDI.update({
                    uuid_cfdi_pago:   uuid_cfdi,
                    pdf_url:          (complement as any)?.pdf_url ?? null,
                    xml_url:          (complement as any)?.xml_url ?? null,
                    estatus_timbrado: uuid_cfdi ? 'TIM' : 'ERR',
                }, { where: { id_pago_cfdi: cfdi.id_pago_cfdi } });

                if (uuid_cfdi) {
                    timbrados++;
                    detalle.push({ id_pago_cfdi: cfdi.id_pago_cfdi, estatus: 'TIM', uuid: uuid_cfdi });
                } else {
                    errores++;
                    detalle.push({ id_pago_cfdi: cfdi.id_pago_cfdi, estatus: 'ERR', error: 'Facturapi no devolvió UUID' });
                }

            } catch (err: any) {
                console.error(`[CxC] Error al timbrar id_pago_cfdi=${cfdi.id_pago_cfdi}:`, err);

                await FacturaPagoCFDI.update(
                    { estatus_timbrado: 'ERR' },
                    { where: { id_pago_cfdi: cfdi.id_pago_cfdi } }
                ).catch(() => {/* ignorar error secundario */});

                errores++;
                detalle.push({ id_pago_cfdi: cfdi.id_pago_cfdi, estatus: 'ERR', error: err.message ?? 'Error desconocido' });
            }
        }

        return {
            ok:       errores === 0,
            timbrados,
            errores,
            total:    pendientes.length,
            detalle,
        };
    },

    marcarVencidas: async () => CxCRepository.marcarVencidas(),
};
