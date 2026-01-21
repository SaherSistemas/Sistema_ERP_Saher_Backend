import { Cat_Riesgo_PuestoRepository } from '../repositories/Cat_Riesgo_Puesto.respository';
import { ICat_Riesgo_Puesto, IUpdateCat_Riesgo_Puesto } from '../interface/Cat_Riesgo_Puesto.interface';

export const Cat_Riesgo_PuestoService = {
    getAll: async (): Promise<ICat_Riesgo_Puesto[]> => await Cat_Riesgo_PuestoRepository.getAll(),

    getById: async (id: string) => {
        const result = await Cat_Riesgo_PuestoRepository.getById(id);
        if (!result) throw new Error("Riesgo de puesto no encontrado");
        return result;
    },

    create: async (data: ICat_Riesgo_Puesto) => {
        if (!data.id_riesgo?.trim() || !data.descrip_riesgo?.trim()) {
            throw new Error("Datos inválidos");
        }
        return await Cat_Riesgo_PuestoRepository.create(data);
    },

    update: async (id: string, data: IUpdateCat_Riesgo_Puesto) => {
        const result = await Cat_Riesgo_PuestoRepository.update(id, data);
        if (!result) throw new Error("No se pudo actualizar");
        return result;
    }
};
