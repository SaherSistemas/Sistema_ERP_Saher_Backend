import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import {ILoteUsadoVenta, ICreateOrUpdateLoteUsadoVenta} from "../../interface/LotesYCaducidad/Lote_Usado_Venta.interaface"
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from "sequelize";

export const LoteUsadoVentaRepository = {
    getAll: async () => {
            return await LoteUsadoVenta.findAll();
        },
        
    getById : async(id : string) => {
         if (isUUID(id)) {
            return await LoteUsadoVenta.findByPk(id);
            }
        },

    create: async (data: Partial<ILoteUsadoVenta>, options?: { transaction?: Transaction }) => {
    return await LoteUsadoVenta.create(data, options);
    },

    // update : async (id_lote_usado : string, data : ICreateOrUpdateLoteUsadoVenta) => {
    //     const existe = await LoteUsadoVentaRepository.getById(id_lote_usado);
    //     if (!existe) return null;
    //     return await existe.update(data)
    // }
}