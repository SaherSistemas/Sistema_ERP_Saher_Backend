import { IMargen_Ganancia_ListaCreate } from "../interface/Marge_Ganancia_Lista.interface";
import { Margen_Ganancia_ListaRepository } from "../repositories/Margen_Ganancia_Lista.repository";

export const Margen_Ganancia_ListaService = {
    getAll: async () => {
        return await Margen_Ganancia_ListaRepository.getAll();
    },

    getPorProducto: async (id_categoria: string, id_presentacion: string) => {
        return await Margen_Ganancia_ListaRepository.getByProducto(id_categoria, id_presentacion);
    },

    create: async (data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_ListaRepository.create(data);
    },

    update: async (id_margen: string, data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_ListaRepository.update(id_margen, data);
    },

}
