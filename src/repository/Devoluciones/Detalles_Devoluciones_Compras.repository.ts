import { v4 } from "uuid";
import { Transaction } from "sequelize";
import { ICreateDetalleDevolucionCompra } from "../../interface/Devoluciones/Devoluciones_Compras.interface";
import { ArticuloRepository } from "../Articulos/Articulo.repository";
import Detalle_Devoluciones_Compras from "../../models/Devolucion_NC/Devolucion/Detalle_Devoluciones_Compras";
import { Devoluciones_ComprasRepository } from "./Devoluciones_Compras.repository";
import Articulo from "../../models/Articulos/Articulo";

export const Detalle_Devoluciones_CompraRepository = {
    create: async (data: ICreateDetalleDevolucionCompra[], options?: { transaction?: Transaction }) => {
        let costoTotal = 0;
        let ivaTotal = 0;

        for (const det of data) {
            const subtotal = det.cantidad * det.costo_unitario;
            costoTotal += subtotal
            ivaTotal += det.iva_unitario * det.cantidad
            await Detalle_Devoluciones_Compras.bulkCreate(
                data.map(det => ({
                    id_detalledevo: v4(),
                    ...det
                })),
                {
                    transaction: options?.transaction
                }
            );
        }


        //console.log(data)

        return await Devoluciones_ComprasRepository.updateIvaYCosto(data[0].id_devo, costoTotal, ivaTotal, { transaction: options?.transaction })
        //GUARDAR DETALLE E IR SUMANDO PARA HACER UN UPDATE AL DEVOLUCIONCOMPRA
    },


    getProductosDeUnaCompraProvedor: async (id_devolucion: string) => {
        return await Detalle_Devoluciones_Compras.findAll({
            where: {
                id_devo: id_devolucion
            },
            include: [
                {
                    model: Articulo,
                    as: "articulo",
                    attributes: ["cod_barr_artic", "des_artic"],
                }
            ],
            attributes: ["cantidad", "costo_unitario", "iva_unitario"],
            order: [["createdAt", "ASC"]],
        });
    }

}