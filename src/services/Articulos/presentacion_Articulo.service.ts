import { ICreateOrUpdatePresentacion_Articulo } from "../../interface/Articulos/Presentacion_Articulo.interface";
import { Presentacion_ArticuloRepository } from "../../repository/Articulos/Presentacion_Articulo.repository";

export const presentacion_ArticuloService = {
    getAll: async () => {
        return await Presentacion_ArticuloRepository.getAll();
    },
    getByID: async (id: string) => {
        return await Presentacion_ArticuloRepository.getByID(id);
    },

    createPresentacion_Articulo: async (data: ICreateOrUpdatePresentacion_Articulo) => {
        return await Presentacion_ArticuloRepository.createPresentacion_Articulo(data)
    },
    updateByID: async (id: string, data: ICreateOrUpdatePresentacion_Articulo) => {
        return await Presentacion_ArticuloRepository.updatePresentacion_Articulo(id, data);
    }
}