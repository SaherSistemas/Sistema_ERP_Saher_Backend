
import { UUID } from "crypto";
import CorteCaja from "../../models/Caja/Corte_Caja";
import { isUUID } from "../../utils/validaciones";
import { ICorteCaja } from "../../interface/Caja/Corte_Caja.interface"; 
import { v4 as uuidv4 } from "uuid";
import { get } from "http";

export const CorteCajaRepository = {
    getAll: async () => {
        return await CorteCaja.findAll();
    },

    getByIDFlexible: async (id_corte: string) => {
        if (isUUID(id_corte)) {
            return await CorteCaja.findByPk(id_corte);
        } else {
            return await CorteCaja.findOne({
                where: {
                    id_caja: id_corte
                }
            });
        }
    },
    
    getCantidadCortesPorCaja: async (id_caja: string) => {
        return await CorteCaja.count({
            where: { id_caja }
        });
    },
  
    createCorteCaja: async (data: ICorteCaja) => {
        return await CorteCaja.create({
            id_corte: uuidv4(),
            ...data
        });
    },

    updateCorteCaja: async (id_corte: string, data: ICorteCaja) => {
        return await CorteCaja.update(data, {
            where: { id_corte }
        });
    },
};