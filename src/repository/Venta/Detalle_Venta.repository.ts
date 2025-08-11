import DetalleVenta from "../../models/Venta/Detalle_Venta";
import { ICreateOrUpdateDetalleVenta, IDetalleVenta} from "../../interface/Venta/Detalle_Venta.interface"
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import { LoteUsadoVentaRepository } from "../LotesYCaducidad/Lote_Usado_Venta.repository";
import Articulo from "../../models/Articulos/Articulo";
import { Transaction } from "sequelize"; 


export const DetalleVentaRepository = {
       getAll: async () => {
        return await DetalleVenta.findAll({
        include: [
            { model: LoteUsadoVenta },
            { model: Articulo, attributes: ['des_artic'] } 

        ]
    });
},


    getById : async (id_detalle_venta : string) => {
         if (isUUID(id_detalle_venta)) {
            return await DetalleVenta.findByPk(id_detalle_venta, {
               include: [
                { model: LoteUsadoVenta  },
                { model: Articulo, attributes: ['des_artic'] } 
     
        ]
     });
    }
    },

    // create: async (data: ICreateOrUpdateDetalleVenta, p0: unknown) => {
    //     const  nuevoUUID = uuidv4();

    //     const detalle = await DetalleVenta.create({
    //     id_detalle_venta: nuevoUUID,
    //     id_venta: data.id_venta,
    //     id_artic: data.id_artic,
    //     cantidad: data.cantidad,
    //     precio_unitario: data.precio_unitario
    // });

    // for (const lote_usado of data.Lote_usado) {
    // await LoteUsadoVentaRepository.create({
    //     ...lote_usado,
    //     id_detalle_venta: detalle.id_detalle_venta
    
    // });
    // }
    // return await DetalleVenta.findByPk(detalle.id_detalle_venta, {
    //     include: [LoteUsadoVenta]
    // });
    // },
      
     create: async (data: Partial<ICreateOrUpdateDetalleVenta>, options?: { transaction?: Transaction }) => {
    return await DetalleVenta.create(data, options);
  },
    

    update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
    if (!isUUID(id)) return null;

    const detalle = await DetalleVenta.findByPk(id);
    if (!detalle) return null;

    await detalle.update(data);
    return detalle;
},


    
}