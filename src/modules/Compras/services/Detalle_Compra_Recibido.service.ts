import { ArticuloRepository } from "../../Inventario/Articulos/repositories/Articulo.repository";
import { Detalle_Compra_RecibidosRepository } from "../repositories/Detalle_Compra_Recibido.repository";
import { v4 as uuidv4 } from 'uuid';

import { Transaction } from 'sequelize';
export const Detalle_Compra_RecibidoService = {
    createDetalleCompraRecibidos: async (
        id_comp: string,
        productosRecibidos: any[],
        transaction?: Transaction
    ) => {
        const idsYCosto = productosRecibidos.map(productoRec => ({
            id_articulo: productoRec.idarticulo_detcomprec,
            costo: productoRec.precio
        }));

        const ivaPorArticulo = await Promise.all(
            idsYCosto.map(p => ArticuloRepository.getIVAPorArticulo(p.id_articulo, p.costo))
        );

        const detallesRecibidos = productosRecibidos.map((productoRec, index) => ({
            id_detcomprec: uuidv4(),
            idcompr_detcomprec: id_comp,
            id_detallecompr_solicitado: productoRec.id_detallecompr_solicitado,
            idarticulo_detcomprec: productoRec.idarticulo_detcomprec,
            cantidad_detcomprec: productoRec.cantidad_recibida,
            precio_detcomprec: productoRec.precio,
            iva_detcomprec: ivaPorArticulo[index] ?? 0,
        }));

        // IMPORTANTE: pasar transaction al repository
        return await Detalle_Compra_RecibidosRepository.createDetallesCompraRecibido(
            detallesRecibidos,
            { transaction }
        );
    },
    getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
        return await Detalle_Compra_RecibidosRepository.getAllDetallesDeCompraRecibidosDeUnaCompra(id_comp);
    }



}