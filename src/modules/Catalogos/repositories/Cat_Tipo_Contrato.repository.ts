import Cat_Tipo_Contrato from '../model/Cat_Tipo_Contrato';
import { ICat_Tipo_Contrato, IUpdateCat_Tipo_Contrato } from '../interface/Cat_Tipo_Contrato.interface';

export const Cat_Tipo_ContratoRepository = {
    getAll: async (): Promise<ICat_Tipo_Contrato[]> => {
        return await Cat_Tipo_Contrato.findAll()
    },

    getById: async (id: string) => {
        return await Cat_Tipo_Contrato.findByPk(id)
    },

    create: async (data: ICat_Tipo_Contrato) => {
        return await Cat_Tipo_Contrato.create({ ...data })
    },

    update: async (id: string, data: IUpdateCat_Tipo_Contrato) => {
        const record = await Cat_Tipo_Contrato.findByPk(id);
        if (!record) return null;
        return await record.update(data);
    }
};
