import { ICrearUnidadMedida, IUnidadMedida } from "../../interface/Articulos/UnidadMedida.interface";
import { UnidadMedidaRepository } from "../../repository/Articulos/UnidadMedida.repository";

export const UnidadMedidaService = {
    getAllUnidadMedida: async (): Promise<IUnidadMedida[]> => {
        return await UnidadMedidaRepository.getAll();
    },

    createUnidadMedida: async (data: ICrearUnidadMedida) => {
        const { descrip_medida, sat_medida } = data

        if (!descrip_medida || !sat_medida) {
            throw new Error("Todos los campos son requeridos");
        }
        const UltimoId = await UnidadMedidaRepository.ultimoId();

        const nuevoID = UltimoId ? UltimoId.id_medida + 1 : 1;

        return await UnidadMedidaRepository.createUnidaMedida(data, nuevoID)
    }
}