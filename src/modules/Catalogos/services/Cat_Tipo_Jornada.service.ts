import { Cat_Tipo_JornadaRepository } from '../repositories/Cat_Tipo_Jornada.repository';
import { ICat_Tipo_Jornada, IUpdateCat_Tipo_Jornada } from '../interface/Cat_Tipo_Jornada.interface';


export const Cat_Tipo_JorandaService = {
    getAll: async (): Promise<ICat_Tipo_Jornada[]> => {
        return await Cat_Tipo_JornadaRepository.getAll()
    },

    getById: async (id: string) => {
        const result = await Cat_Tipo_JornadaRepository.getById(id);
        if (!result) throw new Error("Tipo de jornada no encontrado");
        return result;
    },

    create: async (data: ICat_Tipo_Jornada) => {
        if (!data.id_tipojornada?.trim() || !data.descripcion_tipojorn?.trim()) {
            throw new Error("Datos inválidos");
        }
        return await Cat_Tipo_JornadaRepository.create(data);
    },

    update: async (id: string, data: IUpdateCat_Tipo_Jornada) => {
        const result = await Cat_Tipo_JornadaRepository.update(id, data);
        if (!result) throw new Error("No se pudo actualizar");
        return result;
    }
};
