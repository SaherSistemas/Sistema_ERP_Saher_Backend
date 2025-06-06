import { ICreateOrUpdateCategoria_Articulo } from "../../interface/Articulos/Categoria_Articulo.interface";
import { Categoria_ArticuloRepository } from "../../repository/Articulos/Categoria_Articulo.repository";

export const Categoria_ArticuloService = {
    getAllCategoria: async () => {
        return await Categoria_ArticuloRepository.getAll();
    },
    getByID: async (id: string) => {
        return await Categoria_ArticuloRepository.getById(id)
    },
    obtenerPorTipo: async (id_tipo_art: string) => {
        return await Categoria_ArticuloRepository.obtenerPorTipo(id_tipo_art)
    },
    createCategoria: async (data: ICreateOrUpdateCategoria_Articulo) => {
        return await Categoria_ArticuloRepository.createCategoria_Articulo(data)
    },
    updateByID: async (id: string, data: ICreateOrUpdateCategoria_Articulo) => {
        return await Categoria_ArticuloRepository.updateCategoria_Articulo(id, data)
    }
}