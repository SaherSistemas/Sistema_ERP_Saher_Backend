import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
import { Detalle_Compra_RecibidosRepository } from "../../repository/Compras/Detalle_Compra_Recibido.repository";
import { v4 as uuidv4 } from 'uuid';

export const Detalle_Compra_RecibidoService = {
    createDetalleCompraRecibidos: async (id_comp: string, productosRecibidos: any[]) => {
        // 👇 aquí obtienes pares { id_articulo, costo }
        const idsYCosto = productosRecibidos.map(productoRec => ({
            id_articulo: productoRec.idarticulo_detcomprec,
            costo: productoRec.precio
        }));

        // aquí los mandas a tu repository (puede ser en batch si lo soporta)
        const ivaPorArticulo = await Promise.all(
            idsYCosto.map(p => ArticuloRepository.getIVAPorArticulo(p.id_articulo, p.costo))
        );

        // luego ya haces tus detalles con el IVA incluido si quieres
        const detallesRecibidos = productosRecibidos.map((productoRec, index) => ({
            id_detcomprec: uuidv4(),
            idcompr_detcomprec: id_comp,
            id_detallecompr_solicitado: productoRec.id_detallecompr_solicitado,
            idarticulo_detcomprec: productoRec.idarticulo_detcomprec,
            cantidad_detcomprec: productoRec.cantidad_recibida,
            precio_detcomprec: productoRec.precio,
            iva_detcomprec: ivaPorArticulo[index] ?? 0, // lo que regrese tu repo
        }));

        return await Detalle_Compra_RecibidosRepository.createDetallesCompraRecibido(detallesRecibidos);
    },
    getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
        return await Detalle_Compra_RecibidosRepository.getAllDetallesDeCompraRecibidosDeUnaCompra(id_comp);
    }



}