import { v4 as uuidv4 } from 'uuid';
import { fn, col, Op, Transaction } from 'sequelize';
import Cuenta_Por_Cobrar from '../model/Cuenta_Por_Cobrar.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Remision from '../../Remisiones/model/Remision.model';
import Facturas from '../../../Facturas/model/Facturas.model';

interface ICreateCxC {
    id_cliente_alm: string;
    monto_total: number;
    fecha_vencimiento: Date;
    dias_credito: number;
    id_factura?: string;     // flujo normal
    id_remision?: string;    // flujo Público General
}

export const CxCRepository = {

    getAll: async () => {
        return await Cuenta_Por_Cobrar.findAll({
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision', 'fecha_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getByCliente: async (id_cliente_alm: string) => {
        return await Cuenta_Por_Cobrar.findAll({
            where: { id_cliente_alm },
            include: [
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision', 'total_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getVencidas: async () => {
        return await Cuenta_Por_Cobrar.findAll({
            where: { estatus_cxc: 'VEN' },
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getById: async (id_cxc: string) => {
        return await Cuenta_Por_Cobrar.findByPk(id_cxc, {
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, required: false },
                { model: Remision, required: false },
            ],
        });
    },

    create: async (data: ICreateCxC, t: Transaction) => {
        if (!data.id_factura && !data.id_remision) {
            throw new Error('Se requiere id_factura o id_remision para crear una CxC');
        }

        // ── Validación de límite de crédito ──────────────────────────────────
        // Aplica siempre — todos los clientes tienen límite y días de crédito.
        // La deuda es con el cliente real sin importar si la factura es PG o directa.
        const cliente = await Cliente_Almacen.findByPk(data.id_cliente_alm, { transaction: t });
        if (!cliente) throw new Error('Cliente no encontrado');

        const limite = Number(cliente.limite_credito_cliente_alm ?? 0);

        // limite = 0 → sin restricción (clientes internos o sin límite configurado)
        if (limite > 0) {
            const resultado = await Cuenta_Por_Cobrar.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('saldo_pendiente')), 0), 'total_adeudo']],
                where: {
                    id_cliente_alm: data.id_cliente_alm,
                    estatus_cxc: { [Op.in]: ['PEN', 'PAR', 'VEN'] },
                },
                raw: true,
                transaction: t,
            }) as any;

            const adeudo_actual = Number(resultado?.total_adeudo ?? 0);
            const adeudo_nuevo  = adeudo_actual + data.monto_total;

            if (adeudo_nuevo > limite) {
                throw new Error(
                    `Límite de crédito excedido. ` +
                    `Límite: $${limite.toFixed(2)} | ` +
                    `Adeudo actual: $${adeudo_actual.toFixed(2)} | ` +
                    `Nueva factura: $${data.monto_total.toFixed(2)} | ` +
                    `Total resultante: $${adeudo_nuevo.toFixed(2)}`
                );
            }
        }
        // ── Crear CxC ────────────────────────────────────────────────────────
        return await Cuenta_Por_Cobrar.create({
            id_cxc:            uuidv4(),
            id_factura:        data.id_factura  ?? null,
            id_remision:       data.id_remision ?? null,
            id_cliente_alm:    data.id_cliente_alm,
            monto_total:       data.monto_total,
            monto_pagado:      0,
            saldo_pendiente:   data.monto_total,
            fecha_vencimiento: data.fecha_vencimiento,
            dias_credito:      data.dias_credito,
            estatus_cxc:       'PEN',
        }, { transaction: t });
    },

    aplicarPago: async (id_cxc: string, monto_pago: number, t: Transaction) => {
        const cxc = await Cuenta_Por_Cobrar.findByPk(id_cxc, { transaction: t });
        if (!cxc) throw new Error('CxC no encontrada');

        const nuevo_pagado = Number(cxc.monto_pagado) + monto_pago;
        const nuevo_saldo = Number(cxc.monto_total) - nuevo_pagado;
        const estatus_cxc =
            nuevo_saldo <= 0 ? 'PAG' :
                nuevo_pagado > 0 ? 'PAR' : 'PEN';

        return await cxc.update({
            monto_pagado: nuevo_pagado,
            saldo_pendiente: Math.max(nuevo_saldo, 0),
            estatus_cxc,
        }, { transaction: t });
    },

    marcarVencidas: async () => {
        return await Cuenta_Por_Cobrar.update(
            { estatus_cxc: 'VEN' },
            {
                where: {
                    estatus_cxc: { [Op.in]: ['PEN', 'PAR'] },
                    fecha_vencimiento: { [Op.lt]: new Date() },
                    saldo_pendiente: { [Op.gt]: 0 },
                },
            }
        );
    },
};
