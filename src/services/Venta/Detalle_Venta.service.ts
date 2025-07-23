import {IDetalleVenta, ICreateOrUpdateDetalleVenta} from "../../interface/Venta/Detalle_Venta.interface"
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository"



export const DetalleVentaService = {
    getAll: async () => {
            return await DetalleVentaRepository.getAll();
        },
     getById: async (id: string) => {
            const loteartic = await DetalleVentaRepository.getById(id)
            if (!loteartic) throw new Error("Lote Articulo Sucursal no enocontrado")
            return loteartic
        },
    create : async (data : ICreateOrUpdateDetalleVenta) => {
            return DetalleVentaRepository.create(data);
    },
    
    update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
        const detalle = await DetalleVentaRepository.getById(id);
        if (!detalle) return null;
        await detalle.update(data);
        return detalle;
    }

}