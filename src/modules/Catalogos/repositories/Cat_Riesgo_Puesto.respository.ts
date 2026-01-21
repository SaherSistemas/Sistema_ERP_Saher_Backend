import Cat_Riesgo_Puesto from '../model/Cat_Riesgo_Puesto';

import { ICat_Riesgo_Puesto, IUpdateCat_Riesgo_Puesto } from '../interface/Cat_Riesgo_Puesto.interface';

export const Cat_Riesgo_PuestoRepository = {
    getAll: async (): Promise<ICat_Riesgo_Puesto[]> => {
        return await Cat_Riesgo_Puesto.findAll()
    },

    getById: async (id: string) => {
        return await Cat_Riesgo_Puesto.findByPk(id)
    },

    create: async (data: ICat_Riesgo_Puesto) => {
        return await Cat_Riesgo_Puesto.create({ ...data })
    },

    update: async (id: string, data: IUpdateCat_Riesgo_Puesto) => {
        const record = await Cat_Riesgo_Puesto.findByPk(id);
        if (!record) return null;
        return await record.update(data);
    }
};
