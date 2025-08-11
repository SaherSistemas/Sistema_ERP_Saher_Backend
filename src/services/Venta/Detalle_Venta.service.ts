import { dbLocal } from "../../config/db";
import {IDetalleVenta, ICreateOrUpdateDetalleVenta, IDetalleVentaInput} from "../../interface/Venta/Detalle_Venta.interface"
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository"
import { v4 as uuidv4 } from "uuid";



export const DetalleVentaService = {
    getAll: async () => {
            return await DetalleVentaRepository.getAll();
        },
     getById: async (id: string) => {
            const loteartic = await DetalleVentaRepository.getById(id)
            if (!loteartic) throw new Error("Lote Articulo Sucursal no enocontrado")
            return loteartic
        },
        
   create: async (data: IDetalleVentaInput) => {
     const transaction = await dbLocal.transaction();
     try {
       const id_detalle_venta = uuidv4();
 
       await DetalleVentaRepository.create(
         {
              id_detalle_venta,
              id_artic: data.id_artic,
              cantidad: data.cantidad,
              precio_unitario: data.precio_unitario,
           
         }, { transaction }
       );
       
       for (const lote_usado of data.lote_usado) {
         await DetalleVentaRepository.create(
           {
             ...lote_usado,
            //  id_lote_usado: uuidv4(),
             id_detalle_venta,
           },
           { transaction}
         );
       }
 
       await transaction.commit();
 
       return await DetalleVentaRepository.getById(id_detalle_venta);
 
     } catch (error) {
       await transaction.rollback();
       throw error;
     }
   },
    
    update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
        const detalle = await DetalleVentaRepository.getById(id);
        if (!detalle) return null;
        await detalle.update(data);
        return detalle;
    }

}