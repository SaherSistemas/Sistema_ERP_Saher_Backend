import { Op, Transaction } from "sequelize";
import { v4 } from "uuid";
import { ICreateNotasCreditoProveedor } from "../../../interface/Devolucion_NC/NotaCredito.interface";
import NotasCreditoProveedor from "../../../models/Devolucion_NC/NC/NotasCreditoProveedor";
import Factura_Compra_Proveedor from "../../../modules/Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor";

export const NotasCreditoProveedorRepository = {
    create: async (data: ICreateNotasCreditoProveedor, options?: { transaction?: Transaction }) => {
        const nuevaNotaCredito = await NotasCreditoProveedor.create(
            {
                id_nc: v4(),
                ...data
            },
            { transaction: options?.transaction })

        return nuevaNotaCredito
    },

    getNotasCreditoByFacturaProveedor: async (id_factura_proveedor: string, options?: { transaction?: Transaction }) => {
        return await NotasCreditoProveedor.findAll(
            {
                where: { id_factura_proveedor },
                transaction: options?.transaction
            },
        )
    },

    tienePendiente: async (id_factura_proveedor: string, options?: { transaction?: Transaction }) => {
        return await NotasCreditoProveedor.findOne({
            where: { id_factura_proveedor, estado_nc: 'P' },
            transaction: options?.transaction
        });
    },

    marcarCerradas: async (id_factura_proveedor: string, options?: { transaction?: Transaction }) => {
        return await NotasCreditoProveedor.update(
            { estado_nc: 'C' },
            { where: { id_factura_proveedor, estado_nc: 'P' }, transaction: options?.transaction }
        );
    },

    // Cierra todas las NCs pendientes de todas las facturas de una compra
    marcarCerradasByCompra: async (id_compra_proveedor: string, options?: { transaction?: Transaction }) => {
        const facturas = await Factura_Compra_Proveedor.findAll({
            where: { id_compra_prove_factura: id_compra_proveedor },
            attributes: ['id_factura_proveedor'],
            transaction: options?.transaction,
        });
        const ids_factura = facturas.map(f => f.id_factura_proveedor);
        if (!ids_factura.length) return;

        return await NotasCreditoProveedor.update(
            { estado_nc: 'C' },
            { where: { id_factura_proveedor: { [Op.in]: ids_factura }, estado_nc: 'P' }, transaction: options?.transaction }
        );
    },

    // Aplica los datos de la NC formal del SAT a la NC auto-pendiente existente
    // y la marca como 'A' (aplicada).
    aplicarNCFormal: async (
        id_factura_proveedor: string,
        data: { folio_nc: string; motivo_nc: string; fecha_emision: Date; total_nc: number },
        options?: { transaction?: Transaction }
    ) => {
        return await NotasCreditoProveedor.update(
            {
                folio_nc: data.folio_nc,
                motivo_nc: data.motivo_nc,
                fecha_emision: data.fecha_emision,
                total_nc: data.total_nc,
                estado_nc: 'A',
            },
            { where: { id_factura_proveedor, estado_nc: 'P' }, transaction: options?.transaction }
        );
    },

    // Marca como 'A' (aplicada) cuando la NC formal cubre el faltante.
    marcarAplicadas: async (id_factura_proveedor: string, options?: { transaction?: Transaction }) => {
        return await NotasCreditoProveedor.update(
            { estado_nc: 'A' },
            { where: { id_factura_proveedor, estado_nc: 'P' }, transaction: options?.transaction }
        );
    },
}
