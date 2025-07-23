import DetalleVenta from "../../models/Venta/Detalle_Venta";
import {IDetalleVenta, ICreateOrUpdateDetalleVenta} from "../../interface/Venta/Detalle_Venta.interface"
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import { Sequelize } from "sequelize-typescript";
import { LoteUsadoVentaRepository } from "../LotesYCaducidad/Lote_Usado_Venta.repository";

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


    //CHECAR
    create: async (data : ICreateOrUpdateDetalleVenta) => {
        const  nuevoUUID = uuidv4();

        const detalle = await DetalleVenta.create({
        id_detalle_venta: nuevoUUID,
        id_venta: data.id_venta,
        id_artic: data.id_artic,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario
    });

    // Crear el lote usado ligado al detalle
    await LoteUsadoVentaRepository.create({
        id_detalle_venta: detalle.id_detalle_venta,
        id_lote_sucursal: data.Lote_usado.id_lote_sucursal,
        cantidad_utilizada: data.Lote_usado.cantidad_utilizada
    });

    // Retornar el detalle con include de lote usado
    return await DetalleVenta.findByPk(detalle.id_detalle_venta, {
        include: [LoteUsadoVenta]
    });
    },
      
    

    update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
    if (!isUUID(id)) return null;

    const detalle = await DetalleVenta.findByPk(id);
    if (!detalle) return null;

    await detalle.update(data);
    return detalle;
},


    
}