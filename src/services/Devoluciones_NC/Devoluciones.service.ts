import { Detalle_Devoluciones_CompraRepository } from "../../repository/Devoluciones_NC/Detalles_Devoluciones_Compras.repository";
import { Devoluciones_ComprasRepository } from "../../repository/Devoluciones_NC/Devoluciones_Compras.repository";

export const DevolucionesService = {
    getAllProductosDevolucion: async (id_comp: string) => {
        const id_devolucion = await Devoluciones_ComprasRepository.getIdDevolucionPorCompra(id_comp);

        return await Detalle_Devoluciones_CompraRepository.getProductosDeUnaCompraProvedor(id_devolucion?.id_devo);
    },

}
