import { Cat_Tipo_ContratoRepository } from '../repositories/Cat_Tipo_Contrato.repository';
import { ICat_Tipo_Contrato, IUpdateCat_Tipo_Contrato } from '../interface/Cat_Tipo_Contrato.interface';

export const Cat_Tipo_ContratoService = {
    getAll: async (): Promise<ICat_Tipo_Contrato[]> => await Cat_Tipo_ContratoRepository.getAll(),

    getById: async (id: string) => {
        const result = await Cat_Tipo_ContratoRepository.getById(id);
        if (!result) throw new Error("Tipo de contrato no encontrado");
        return result;
    },

    create: async (data: ICat_Tipo_Contrato) => {
        if (!data.id_tipocontrato?.trim() || !data.descripcion_tipocon?.trim()) {
            throw new Error("Datos inválidos");
        }
        return await Cat_Tipo_ContratoRepository.create(data);
    },

    update: async (id: string, data: IUpdateCat_Tipo_Contrato) => {
        const result = await Cat_Tipo_ContratoRepository.update(id, data);
        if (!result) throw new Error("No se pudo actualizar");
        return result;
    }
};
