import { ICreateOrUpdateUnidadMedida } from "../../interface/Articulos/UnidadMedida.interface";
import { UnidadMedidaRepository } from "../../repository/Articulos/UnidadMedida.repository";

export const UnidadMedidaService = {
    getAllUnidadMedida: async () => {
        return await UnidadMedidaRepository.getAll();
    },
    getByID: async (id: number) => {
        return await UnidadMedidaRepository.getByID(id);
    },

    createUnidadMedida: async (data: ICreateOrUpdateUnidadMedida) => {
        return await UnidadMedidaRepository.createUnidaMedida(data)
    },
    updateByID: async (id_medida: number, data: ICreateOrUpdateUnidadMedida) => {
        return await UnidadMedidaRepository.updateMedida(id_medida, data);
    }
}