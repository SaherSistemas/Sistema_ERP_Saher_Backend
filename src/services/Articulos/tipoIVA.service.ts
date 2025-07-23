import { Tipo_IVARepository } from "../../repository/Articulos/Tipo_IVA.repository";
import { ITipo_IVA, ICreateOrUpdateTipo_IVA } from "../../interface/Articulos/Tipo_IVA.interface";

export const Tipo_IVAService = {
    getAll: async (): Promise<ITipo_IVA[]> => {
        return await Tipo_IVARepository.getAll();
    },
    getByID: async (id: number): Promise<ITipo_IVA> => {
        return await Tipo_IVARepository.getByID(id)
    },
    createTipoIVA: async (data: ICreateOrUpdateTipo_IVA) => {

        return await Tipo_IVARepository.create(data)
    },
    updateTipoIVA: async (id: number, data: ICreateOrUpdateTipo_IVA) => {
        return await Tipo_IVARepository.update(id, data)
    },
}