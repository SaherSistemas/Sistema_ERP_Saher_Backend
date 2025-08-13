import { Transaction } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import Venta_Pago from "../../models/Venta/Venta_Pago";
import { ICreateOrUpdateVentaPago, IVentaPago } from "../../interface/Venta/Venta_Pago.interface";
import { VentaPagoRepository } from "../../repository/Venta/Venta_Pago.repository";
import id from "zod/v4/locales/id.js";


export const VentaPagoService = {
    getAll : async ()=>{
        return await VentaPagoRepository.getAll();
        
    },
    getById : async (id : string)=>{
        return await VentaPagoRepository.getById(id);
    },

    create: async(data:ICreateOrUpdateVentaPago) =>{
        return await VentaPagoRepository.create(data);
    },
}