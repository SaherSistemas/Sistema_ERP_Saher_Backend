import Cat_Bancos from '../model/Cat_Bancos';
import { ICat_Bancos, IUpdateCat_Bancos } from '../interface/Cat_Bancos.interface';

export const Cat_BancosRepository = {
    getAll: async (): Promise<ICat_Bancos[]> => {
        return await Cat_Bancos.findAll()
    },

    getById: async (id: string) => {
        return await Cat_Bancos.findByPk(id)
    },

    create: async (data: ICat_Bancos) => {
        return await Cat_Bancos.create({ ...data })
    },

    update: async (id: string, data: IUpdateCat_Bancos) => {
        const record = await Cat_BancosRepository.getById(id);
        if (!record) return null;
        return await record.update(data);
    }
};
