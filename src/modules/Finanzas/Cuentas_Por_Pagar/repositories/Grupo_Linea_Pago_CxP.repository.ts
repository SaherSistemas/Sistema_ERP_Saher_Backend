import { Transaction, Op } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Grupo_Linea_Pago_CxP from '../model/Grupo_Linea_Pago_CxP.model';
import Grupo_Linea_Pago_Detalle from '../model/Grupo_Linea_Pago_Detalle.model';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';

export const Grupo_Linea_Pago_Repository = {

    crear: async (data: {
        id_proveedor:       string;
        fecha_pago:         string;
        id_forma_pago?:     string | null;
        referencia?:        string | null;
        notas?:             string | null;
        id_empleado_genera?: string | null;
        lineas: { id_cxp: string; monto: number }[];
    }) => {
        return await dbLocal.transaction(async (t: Transaction) => {
            const monto_total = data.lineas.reduce((s, l) => s + l.monto, 0);

            const grupo = await Grupo_Linea_Pago_CxP.create({
                id_proveedor:       data.id_proveedor,
                monto_total,
                fecha_pago:         new Date(data.fecha_pago),
                id_forma_pago:      data.id_forma_pago  ?? null,
                referencia:         data.referencia     ?? null,
                notas:              data.notas          ?? null,
                estado:             'PEN',
                id_empleado_genera: data.id_empleado_genera ?? null,
            }, { transaction: t });

            for (const l of data.lineas) {
                await Grupo_Linea_Pago_Detalle.create({
                    id_grupo: grupo.id_grupo,
                    id_cxp:   l.id_cxp,
                    monto:    l.monto,
                }, { transaction: t });
            }

            return grupo;
        });
    },

    getAllPendientes: async (filtros?: { id_proveedor?: string }) => {
        const where: any = { estado: 'PEN' };
        if (filtros?.id_proveedor) where.id_proveedor = filtros.id_proveedor;

        return await Grupo_Linea_Pago_CxP.findAll({
            where,
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Grupo_Linea_Pago_Detalle,
                    include: [{
                        model: Cuenta_Por_Pagar,
                        attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total', 'fecha_vencimiento'],
                    }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    getRegistradosMes: async () => {
        const inicio = new Date();
        inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
        return await Grupo_Linea_Pago_CxP.findAll({
            where: { estado: 'REG', updatedAt: { [Op.gte]: inicio } },
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Grupo_Linea_Pago_Detalle,
                    include: [{ model: Cuenta_Por_Pagar, attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total'] }],
                },
            ],
            order: [['updatedAt', 'DESC']],
        });
    },

    getById: async (id_grupo: string) => {
        return await Grupo_Linea_Pago_CxP.findByPk(id_grupo, {
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Grupo_Linea_Pago_Detalle,
                    include: [{
                        model: Cuenta_Por_Pagar,
                        attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total', 'fecha_vencimiento'],
                    }],
                },
            ],
        });
    },

    getGruposPorCxP: async (id_cxp: string) => {
        const detalles = await Grupo_Linea_Pago_Detalle.findAll({ where: { id_cxp } });
        const ids = detalles.map(d => d.id_grupo);
        if (ids.length === 0) return [];
        return await Grupo_Linea_Pago_CxP.findAll({
            where: { id_grupo: { [Op.in]: ids }, estado: 'PEN' },
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Grupo_Linea_Pago_Detalle,
                    include: [{ model: Cuenta_Por_Pagar, attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total'] }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    marcarRegistrado: async (id_grupo: string, url_comprobante?: string) => {
        return await Grupo_Linea_Pago_CxP.update(
            { estado: 'REG', url_comprobante: url_comprobante ?? null },
            { where: { id_grupo } }
        );
    },

    marcarCancelado: async (id_grupo: string) => {
        return await Grupo_Linea_Pago_CxP.update({ estado: 'CAN' }, { where: { id_grupo } });
    },
};
