import Venta from "../../models/Venta/Venta";
import DetalleVenta from "../../models/Venta/Detalle_Venta";
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import {IVenta, ICreateOrUpdateVenta} from "../../interface/Venta/Venta.interface"
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';

export const VentaRepository = {
   getAll: async () => {
    return await Venta.findAll({
        include: [
            {
                model: DetalleVenta,
                include: [
                    {
                        model: LoteUsadoVenta
                    }
                ]
            }
        ]
    });
},


    getById : async (id_venta : string) => {
         if (isUUID(id_venta)) {
            return await Venta.findByPk(id_venta, {
               include: [
                {
                model: DetalleVenta,
                include: [
                    {
                        model: LoteUsadoVenta
                    }
                ]
            }
        ]
     });
    }
    },

    create: async (data: ICreateOrUpdateVenta) => {
        const nuevoUUID = uuidv4();
        
        return await Venta.create({
            id_venta : nuevoUUID,
            ...data
        });
    },

    update: async (id_venta: string, data: Partial<ICreateOrUpdateVenta>) => {
        const venta = await Venta.findByPk(id_venta);
        if (!venta) return null;
        return await venta.update(data);
  },
//     delete: async (id_venta: string) => {
//         const venta = await Venta.findByPk(id_venta);
//         if (!venta) return null;
//         await venta.destroy();
//         return true;
//   },

}
