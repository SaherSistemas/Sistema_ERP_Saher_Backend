import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";

export const Detalle_CompraService = {
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_SolicitadoRepository.getAllArticulosPorCompra(id_comp)
    },
}