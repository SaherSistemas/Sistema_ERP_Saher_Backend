import { UUID } from "crypto";
import ParametroCaja from "../../models/Caja/Parametro_Caja";
import { isUUID } from "../../utils/validaciones";
import { IParametroCaja } from "../../interface/Caja/Parametro_Caja.interface";
import { v4 as uuidv4 } from "uuid";

export const ParametroCajaRepository = {
    getAll: async () => {
        return await ParametroCaja.findAll();
    },

    getByID: async (id_parametro_caja: string) => {
        if (isUUID(id_parametro_caja)) {
            return await ParametroCaja.findByPk(id_parametro_caja);
        } else {
            throw new Error("ID no es un UUID válido");
        }
    },

    create: async (data: IParametroCaja) => {
        return await ParametroCaja.create({
            id_parametro_caja: uuidv4(),
            ...data
        });
    },

    update: async (id_parametro_caja: string, data: Partial<IParametroCaja>) => {
        return await ParametroCaja.update(data, {
            where: { id_parametro_caja }
        });
    }
}