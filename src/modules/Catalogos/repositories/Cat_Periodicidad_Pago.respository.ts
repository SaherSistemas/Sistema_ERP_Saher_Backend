import Cat_Periodicidad_Pago from '../model/Cat_Periodicidad_Pago';
import { ICat_Periodicidad_Pago, IUpdateCat_Periodicidad_Pago } from '../interface/Cat_Periodicidad_Pago.interface';

export const Cat_Periodicidad_PagoRepository = {
    getAll: async (): Promise<ICat_Periodicidad_Pago[]> => {
        return await Cat_Periodicidad_Pago.findAll()
    },

    getById: async (id: string) => {
        return await Cat_Periodicidad_Pago.findByPk(id)
    },

    create: async (data: ICat_Periodicidad_Pago) => {
        return await Cat_Periodicidad_Pago.create({ ...data })
    },

    update: async (id: string, data: IUpdateCat_Periodicidad_Pago) => {
        const record = await Cat_Periodicidad_Pago.findByPk(id);
        if (!record) return null;
        return await record.update(data);
    }
};
