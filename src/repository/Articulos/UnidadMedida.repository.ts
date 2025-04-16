import { IUnidadMedida, ICrearUnidadMedida } from "../../interface/Articulos/UnidadMedida.interface";
import UnidadMedida from "../../models/Articulos/UnidadMedida";

export const UnidadMedidaRepository = {
    getAll: async (): Promise<IUnidadMedida[]> => {
        return UnidadMedida.findAll();
    },

    ultimoId: async () => {
        return await UnidadMedida.findOne({
            order: [["id_medida", "DESC"]]
        })
    },
    createUnidaMedida: async (data: ICrearUnidadMedida, nuevoId: number): Promise<IUnidadMedida> => {
        return await UnidadMedida.create({
            id_medida: nuevoId,
            ...data
        })
    }
}