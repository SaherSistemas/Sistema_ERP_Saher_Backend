import { Tipo_ArticuloRepository } from "../repositories/Tipo_Articulo.repository";
import { ICreateOrUpdateTipo_Articulo, ITipo_Articulo } from "../interface/Tipo_Articulo.interface";
export const Tipo_ArticuloService = {
    getAll: async () => {
        return await Tipo_ArticuloRepository.getAll();
    },
    getByID: async (id: string) => {
        return await Tipo_ArticuloRepository.getByID(id)
    },
    createTipoArticulo: async (data: ICreateOrUpdateTipo_Articulo) => {

        return await Tipo_ArticuloRepository.create(data)
    },
    updateTipoArticulo: async (id: string, data: ICreateOrUpdateTipo_Articulo) => {
        return await Tipo_ArticuloRepository.update(id, data)
    },
}