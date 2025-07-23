import {IVenta, ICreateOrUpdateVenta} from "../../interface/Venta/Venta.interface"
import { VentaRepository } from "../../repository/Venta/Venta.repository"



export const VentaService = {
    getAll: async () => {
            return await VentaRepository.getAll();
        },


     getById: async (id: string) => {
            const loteartic = await VentaRepository.getById(id)
            if (!loteartic) throw new Error("Venta no enocontrada")
            return loteartic
        },
    
    create : async (data : ICreateOrUpdateVenta) => {
            return VentaRepository.create(data);
    },
    
    update: async (id: string, data: Partial<ICreateOrUpdateVenta>) => {
        const detalle = await VentaRepository.getById(id);
        if (!detalle) return null;
        await detalle.update(data);
        return detalle;
    }

}