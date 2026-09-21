import { CompraGeneralRepository } from "../repositories/Compra_General.repository";
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";
import { dbLocal } from "../../../../config/db";
import { QueryTypes } from "sequelize";

// Solo se puede cambiar/quitar un renglón mientras la orden no se haya recibido: en captura (C) o ya
// capturada/enviada (A), y si nada de ese renglón se ha capturado en una factura del proveedor.
async function validarRenglonEditable(detalle: { id_detcompsol: string; idcompr_detcompsol: string }) {
    const compra = await Compra_ProveedorRepository.getByID(detalle.idcompr_detcompsol);
    if (!compra) throw new Error('La orden de compra no existe.');
    if (!['C', 'A'].includes(compra.estado_comp)) {
        throw new Error('La orden ya está en recepción o cerrada: no se puede modificar.');
    }
    const [r] = await dbLocal.query<any>(
        `SELECT COUNT(*) AS n FROM detalle_factura_compra_proveedor WHERE id_detcompsol = :id`,
        { replacements: { id: detalle.id_detcompsol }, type: QueryTypes.SELECT });
    if (Number(r?.n) > 0) throw new Error('Este artículo ya tiene mercancía recibida en una factura: no se puede modificar.');
}

export const Detalle_CompraService = {
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_SolicitadoRepository.getAllArticulosPorCompra(id_comp)
    },
    // Cambia la cantidad pedida de un renglón de la orden
    actualizarCantidad: async (id_detcompsol: string, cantidad: number, id_empleado?: string | null) => {
        const n = Number(cantidad);
        if (!Number.isInteger(n) || n <= 0) throw new Error('La cantidad debe ser un entero mayor a 0.');
        if (n > 32767) throw new Error('La cantidad es demasiado grande.');
        const detalle = await Detalle_Compra_SolicitadoRepository.getByPK(id_detcompsol);
        if (!detalle) throw new Error('Detalle no encontrado');
        await validarRenglonEditable(detalle);
        detalle.cantidad_detcompsol = n;
        if (id_empleado) detalle.id_empleado_captura = id_empleado;
        await detalle.save();
        return { id_detcompsol, cantidad: n };
    },
    deleteDetalleCompra: async (id_detcompsol: string) => {
        const detalle = await Detalle_Compra_SolicitadoRepository.getByPK(id_detcompsol);
        if (!detalle) throw new Error('Detalle no encontrado');
        await validarRenglonEditable(detalle);
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