import { Detalle_Compra_RecibidosRepository } from "../../repository/Compras/Detalle_Compra_Recibido.repository";
import { v4 as uuidv4 } from 'uuid';

export const Detalle_Compra_RecibidoService = {
    createDetalleCompraRecibidos: async (id_comp: string, productosRecibidos: any[]) => {
        const detallesRecibidos = productosRecibidos.map(productoRec => ({
            id_detcomprec: uuidv4(),
            idcompr_detcomprec: id_comp,
            idarticulo_detcomprec: productoRec.idarticulo_detcomprec,
            cantidad_detcomprec: productoRec.cantidad_recibida,
            precio_detcomprec: productoRec.precio,
        }));
        return await Detalle_Compra_RecibidosRepository.createDetallesCompraRecibido(detallesRecibidos);
    },
    getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
        return await Detalle_Compra_RecibidosRepository.getAllDetallesDeCompraRecibidosDeUnaCompra(id_comp);
    }



}