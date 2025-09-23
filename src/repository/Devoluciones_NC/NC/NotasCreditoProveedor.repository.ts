import { v4 } from "uuid";
import { Transaction } from "sequelize";
import { ICreateNotasCreditoProveedor } from "../../../interface/Devolucion_NC/NotaCredito.interface";
import NotasCreditoProveedor from "../../../models/Devolucion_NC/NC/NotasCreditoProveedor";

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

    getNotasCreditoByCompraProveedor: async (id_compra_proveedor: string, options?: { transaction?: Transaction }) => {
        return await NotasCreditoProveedor.findAll(
            {
                where: {
                    id_compra_proveedor
                },
                transaction: options?.transaction
            },
        )
    }
}