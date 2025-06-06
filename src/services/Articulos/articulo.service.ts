import { ICreateOrUpdateArticulo } from "../../interface/Articulos/Articulo.interface";
import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
export const ArticuloService = {
    getAllPaginado: async (page: number = 1, limit: number = 100) => {
        return await ArticuloRepository.getAllPag(page, limit);
    },
    getByID: async (id: string) => {
        return await ArticuloRepository.getByIDFlexible(id);
    },

    createArticulo: async (data: ICreateOrUpdateArticulo) => {
        return await ArticuloRepository.createArticulo(data)
    },
    updateByID: async (id_articulo: string, data: ICreateOrUpdateArticulo) => {
        return await ArticuloRepository.updateArticulo(id_articulo, data);
    }
}