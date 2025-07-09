import DetalleVenta from "../../models/Venta/Detalle_Venta";
import {IDetalleVenta, ICreateOrUpdateDetalleVenta} from "../../interface/Venta/Detalle_Venta.interface"
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";

export const DetalleVentaRepository = {
       getAll: async () => {
    return await DetalleVenta.findAll({
        include: [
            { model: LoteUsadoVenta }
        ]
    });
},


    getById : async (id_detalle_venta : string) => {
         if (isUUID(id_detalle_venta)) {
            return await DetalleVenta.findByPk(id_detalle_venta, {
               include: [
                { model: LoteUsadoVenta  }
        ]
     });
    }
    },

    create: async (data : ICreateOrUpdateDetalleVenta) => {
        const nuevoUUID = uuidv4();
         return await DetalleVenta.create ({
            id_lote_usado: nuevoUUID,
            ...data
         })
    },

    update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
    if (!isUUID(id)) return null;

    const detalle = await DetalleVenta.findByPk(id);
    if (!detalle) return null;

    await detalle.update(data);
    return detalle;
},


    
}