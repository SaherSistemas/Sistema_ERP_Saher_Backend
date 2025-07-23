import { IParametroCaja } from "../../interface/Caja/Parametro_Caja.interface";
import { ParametroCajaRepository } from "../../repository/Caja/Parametro_Caja.repository";
import { ColoniaRepository } from "../../repository/Lugares/Colonia.respository";


export const ParametroCajaService = {
    getAll: async () => {
        return await ParametroCajaRepository.getAll();
    },

    getByID: async (id_parametro_caja: string) => {
        return await ParametroCajaRepository.getByID(id_parametro_caja);
    },

    create: async (data: IParametroCaja) => {
        return await ParametroCajaRepository.create(data);
    },

    update: async (id_parametro_caja: string, data: Partial<IParametroCaja>) => {
        return await ParametroCajaRepository.update(id_parametro_caja, data);
    }
}