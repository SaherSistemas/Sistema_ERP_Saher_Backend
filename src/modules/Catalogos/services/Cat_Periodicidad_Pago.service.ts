import { Cat_Periodicidad_PagoRepository } from '../repositories/Cat_Periodicidad_Pago.respository';
import { ICat_Periodicidad_Pago, IUpdateCat_Periodicidad_Pago } from '../interface/Cat_Periodicidad_Pago.interface';

export const Cat_Periodicidad_Pago = {
    getAll: async (): Promise<ICat_Periodicidad_Pago[]> => {
        return await Cat_Periodicidad_PagoRepository.getAll()
    },
    getById: async (id: string) => {
        const result = await Cat_Periodicidad_PagoRepository.getById(id);
        if (!result) throw new Error("Tipo de periocidad de pago no encontrado");
        return result;
    },

    create: async (data: ICat_Periodicidad_Pago) => {
        if (!data.id_periodicidad?.trim() || !data.descrip_periodical?.trim()) {
            throw new Error("Datos inválidos");
        }
        return await Cat_Periodicidad_PagoRepository.create(data);
    },

    update: async (id: string, data: IUpdateCat_Periodicidad_Pago) => {
        const result = await Cat_Periodicidad_PagoRepository.update(id, data);
        if (!result) throw new Error("No se pudo actualizar");
        return result;
    }
};
