import { CompraGeneralRepository } from "../repositories/Compra_General.repository";
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";

export const Detalle_CompraService = {
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_SolicitadoRepository.getAllArticulosPorCompra(id_comp)
    },
    deleteDetalleCompra: async (id_detcompsol: string) => {
        const detalle = await Detalle_Compra_SolicitadoRepository.getByPK(id_detcompsol);
        if (!detalle) throw new Error('Detalle no encontrado');
        await Detalle_Compra_SolicitadoRepository.deleteDetalleCompra(id_detcompsol);
        const idComp = detalle.idcompr_detcompsol;
        const restantes = await Detalle_Compra_SolicitadoRepository.cuentaDetalle(idComp);
        if (restantes === 0) {
            const compraProveedor = await Compra_ProveedorRepository.getByID(idComp);
            const idCompraGeneral = compraProveedor?.id_compra_general;

            await Compra_ProveedorRepository.eliminarCompraProveedor(idComp);

            if (idCompraGeneral) {
                const comprasRestantes = await Compra_ProveedorRepository.cuentaPorCompraGeneral(idCompraGeneral);
                if (comprasRestantes === 0) {
                    await CompraGeneralRepository.eliminarCompraGeneral(idCompraGeneral);
                }
            }
        }
        return { message: 'Eliminado correctamente' };
    },
}