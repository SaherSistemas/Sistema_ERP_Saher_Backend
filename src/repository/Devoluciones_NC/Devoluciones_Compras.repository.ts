import { v4 } from "uuid";
import { Op, Transaction } from "sequelize";
import { ICreateDevoluciones_Compra } from "../../interface/Devolucion_NC/Devoluciones_Compras.interface";
import Devoluciones_Compras from "../../models/Devolucion_NC/Devolucion/Devoluciones_Compras";
import { Factura_Compra_ProveedorRepository } from "../../modules/Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository";

export const Devoluciones_ComprasRepository = {
    create: async (data: ICreateDevoluciones_Compra, options?: { transaction?: Transaction }) => {
        const factura = await Factura_Compra_ProveedorRepository.getByID(data.id_compr_prove)
        const devolucion = await Devoluciones_Compras.create(
            {
                id_devo: v4(),
                id_factura: factura.id_factura_proveedor,
                ...data
            },
            { transaction: options?.transaction })

        return devolucion.id_devo
    },

    getByID: async (id_devo: string, options?: { transaction?: Transaction }) => {
        return await Devoluciones_Compras.findByPk(id_devo, {
            transaction: options?.transaction
        });
    },
    getIdDevolucionPorCompra: async (id_comp: string) => {
        return await Devoluciones_Compras.findOne({
            where: {
                id_compr_prove: id_comp
            },
            attributes: ['id_devo']
        })
    },
    updateIvaYCosto: async (id_devo: string, costoTotal: number, ivaTotal: number, options?: { transaction?: Transaction }) => {
        const encabezadoDevolucion = await Devoluciones_ComprasRepository.getByID(id_devo, { transaction: options?.transaction });

        return await encabezadoDevolucion.update({
            subtotal: costoTotal,
            iva_total: ivaTotal
        },
            { transaction: options?.transaction })
    }


}