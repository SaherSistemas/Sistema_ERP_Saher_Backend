import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Nota_Credito_Cliente from '../model/Nota_Credito_Cliente.model';
import Cuenta_Por_Cobrar from '../../../Finanzas/Cuentas_Por_Cobrar/model/Cuenta_Por_Cobrar.model';
import Pago_CxC from '../../../Finanzas/Cuentas_Por_Cobrar/model/Pago_CxC.model';
import Devolucion_Cliente from '../../Devoluciones_Cliente/model/Devolucion_Cliente.model';
import Facturas from '../../../Facturas/model/Facturas.model';
import Remision from '../../../Finanzas/Remisiones/model/Remision.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';

export const NotaCreditoClienteRepository = {

    // ── Todas las notas (vista admin) con filtros opcionales ─────────────
    getAll: async (filtros?: {
        estatus?: string;
        id_cliente_alm?: string;
    }) => {
        const where: Record<string, any> = {};
        if (filtros?.estatus) where['estatus'] = filtros.estatus;
        if (filtros?.id_cliente_alm) where['id_cliente_alm'] = filtros.id_cliente_alm;

        return await Nota_Credito_Cliente.findAll({
            where,
            include: [
                {
                    model: Cliente_Almacen,
                    attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
                },
                {
                    model: Devolucion_Cliente,
                    attributes: ['id_devolucion_cliente', 'id_factura', 'motivo', 'fecha_solicitud'],
                    include: [{
                        model: Facturas,
                        attributes: ['folio_factura'],
                    }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Notas disponibles/parciales de un cliente ─────────────────────────
    getDisponiblesCliente: async (id_cliente_alm: string) => {
        return await Nota_Credito_Cliente.findAll({
            where: {
                id_cliente_alm,
                estatus: { [Op.in]: ['DISPONIBLE', 'PARCIAL'] },
            },
            include: [{
                model: Devolucion_Cliente,
                attributes: ['id_devolucion_cliente', 'fecha_solicitud'],
                include: [{
                    model: Facturas,
                    attributes: ['folio_factura'],
                }],
            }],
            order: [['createdAt', 'ASC']],   // más antiguos primero (FIFO)
        });
    },

    // ── Detalle de una nota ───────────────────────────────────────────────
    getById: async (id_nota_credito: string) => {
        return await Nota_Credito_Cliente.findByPk(id_nota_credito, {
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                {
                    model: Devolucion_Cliente,
                    attributes: ['id_devolucion_cliente', 'id_factura', 'fecha_solicitud'],
                    include: [{ model: Facturas, attributes: ['folio_factura'] }],
                },
            ],
        });
    },

    // ── Aplicar nota a una CxC (parcial o total) ──────────────────────────
    //
    //  Reglas:
    //   · monto_aplicar ≤ nota.saldo_disponible
    //   · monto_aplicar ≤ cxc.saldo_pendiente
    //   · Si consume toda la nota → estatus = APLICADA
    //   · Si queda saldo en la nota → estatus = PARCIAL
    //   · La CxC se reduce igual que con un pago normal
    //   · Se crea un pago_cxc con estatus DEV (no requiere CFDI complemento)
    //
    aplicar: async (params: {
        id_nota_credito: string;
        id_cxc: string;
        monto_aplicar: number;
        id_empleado_aplica: string;
    }) => {
        const { id_nota_credito, id_cxc, monto_aplicar, id_empleado_aplica } = params;

        const t = await dbLocal.transaction();
        try {
            // 1. Cargar nota
            const nota = await Nota_Credito_Cliente.findByPk(id_nota_credito, { transaction: t });
            if (!nota) throw Object.assign(new Error('Nota de crédito no encontrada.'), { status: 404 });
            if (!['DISPONIBLE', 'PARCIAL'].includes(nota.estatus)) {
                throw Object.assign(new Error('La nota de crédito ya fue aplicada completamente o no está disponible.'), { status: 400 });
            }

            const saldo_nota = Number(nota.saldo_disponible);
            if (monto_aplicar <= 0) {
                throw Object.assign(new Error('El monto a aplicar debe ser mayor a 0.'), { status: 400 });
            }
            if (monto_aplicar > saldo_nota + 0.001) {   // tolerancia centavo
                throw Object.assign(new Error(
                    `El monto a aplicar ($${monto_aplicar.toFixed(2)}) excede el saldo disponible de la nota ($${saldo_nota.toFixed(2)}).`
                ), { status: 400 });
            }

            // 2. Cargar CxC
            const cxc = await Cuenta_Por_Cobrar.findByPk(id_cxc, { transaction: t });
            if (!cxc) throw Object.assign(new Error('Cuenta por Cobrar no encontrada.'), { status: 404 });
            if (cxc.estatus_cxc === 'PAG') {
                throw Object.assign(new Error('La Cuenta por Cobrar ya está pagada.'), { status: 400 });
            }

            const saldo_cxc = Number(cxc.saldo_pendiente);
            const aplicar = Math.min(monto_aplicar, saldo_cxc);   // no pasar del saldo

            // 3. Actualizar nota
            const nuevo_saldo_nota = +(saldo_nota - aplicar).toFixed(2);
            await nota.update({
                saldo_disponible: nuevo_saldo_nota,
                estatus: nuevo_saldo_nota <= 0 ? 'APLICADA' : 'PARCIAL',
            }, { transaction: t });

            // 4. Actualizar CxC
            const nuevo_saldo_cxc = Math.max(0, +(saldo_cxc - aplicar).toFixed(2));
            const nuevo_monto_pago = +(Number(cxc.monto_pagado) + aplicar).toFixed(2);
            const nuevo_estatus_cxc =
                nuevo_saldo_cxc <= 0 ? 'PAG' :
                    nuevo_monto_pago > 0 ? 'PAR' : 'PEN';

            await cxc.update({
                saldo_pendiente: nuevo_saldo_cxc,
                monto_pagado: nuevo_monto_pago,
                estatus_cxc: nuevo_estatus_cxc,
            }, { transaction: t });


            // 5. Registrar pago contable (estatus DEV — sin CFDI complemento)
            const pago = await Pago_CxC.create({
                id_pago_cxc: uuidv4(),
                id_cxc,
                id_metodo_pago: 'PUE',
                id_forma_pago: '17',   // compensación SAT
                monto_pago: aplicar,
                fecha_pago: new Date(),
                numero_recibo: `NC-${id_nota_credito.slice(0, 8)}`,
                referencia_pago: `Nota de crédito: ${nota.uuid_cfdi_egreso ?? id_nota_credito}`,
                id_empleado_captura: id_empleado_aplica,
                id_empleado_aplica,
                fecha_aplicado: new Date(),
                notas: `Aplicación de nota de crédito${nota.uuid_cfdi_egreso ? ` · CFDI-E: ${nota.uuid_cfdi_egreso}` : ''}`,
                estatus_pago: 'DEV',
            }, { transaction: t });

            await t.commit();

            return {
                monto_aplicado: aplicar,
                saldo_nota_restante: nuevo_saldo_nota,
                estatus_nota: nuevo_saldo_nota <= 0 ? 'APLICADA' : 'PARCIAL',
                nuevo_saldo_cxc,
                estatus_cxc: nuevo_estatus_cxc,
                id_pago_cxc: pago.id_pago_cxc,
            };

        } catch (err) {
            await t.rollback();
            throw err;
        }
    },
};
