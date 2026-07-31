import { Op } from 'sequelize';
import Linea_Pago_CxP from '../model/Linea_Pago_CxP.model';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';

export const Linea_Pago_CxP_Repository = {

    create: async (data: {
        id_cxp: string;
        id_proveedor: string;
        monto: number;
        fecha_pago: string;
        id_forma_pago?: string | null;
        referencia?: string | null;
        notas?: string | null;
        id_empleado_genera?: string | null;
    }) => {
        return await Linea_Pago_CxP.create({
            id_cxp:             data.id_cxp,
            id_proveedor:       data.id_proveedor,
            monto:              data.monto,
            fecha_pago:         new Date(data.fecha_pago),
            id_forma_pago:      data.id_forma_pago ?? null,
            referencia:         data.referencia ?? null,
            notas:              data.notas ?? null,
            estado:             'PEN',
            id_empleado_genera: data.id_empleado_genera ?? null,
        });
    },

    getLineasPendientesByCxP: async (id_cxp: string) => {
        return await Linea_Pago_CxP.findAll({
            where: { id_cxp, estado: 'PEN' },
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    getAllPendientes: async (filtros?: { id_proveedor?: string }) => {
        const where: any = { estado: 'PEN' };
        return await Linea_Pago_CxP.findAll({
            where,
            include: [
                {
                    model: Cuenta_Por_Pagar,
                    attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total'],
                    ...(filtros?.id_proveedor ? { where: { id_proveedor: filtros.id_proveedor } } : {}),
                },
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    getRegistradosMes: async () => {
        const inicio = new Date();
        inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
        return await Linea_Pago_CxP.findAll({
            where: { estado: 'REG', updatedAt: { [Op.gte]: inicio } },
            include: [
                { model: Cuenta_Por_Pagar, attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'monto_total'] },
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
            ],
            order: [['updatedAt', 'DESC']],
        });
    },

    marcarRegistrada: async (id_linea_pago: string, url_comprobante?: string) => {
        return await Linea_Pago_CxP.update(
            { estado: 'REG', url_comprobante: url_comprobante ?? null },
            { where: { id_linea_pago } }
        );
    },

    marcarCancelada: async (id_linea_pago: string) => {
        return await Linea_Pago_CxP.update(
            { estado: 'CAN' },
            { where: { id_linea_pago } }
        );
    },

    getById: async (id_linea_pago: string) => {
        return await Linea_Pago_CxP.findByPk(id_linea_pago, {
            include: [
                { model: Cuenta_Por_Pagar, attributes: ['id_cxp', 'folio_factura', 'saldo_pendiente', 'id_proveedor'] },
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
            ],
        });
    },
};
