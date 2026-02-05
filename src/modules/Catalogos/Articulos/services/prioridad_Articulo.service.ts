import { ICreateOrUpdatePrioridad_Artiulo, IPrioridad_Articulo } from "../interface/Prioridad_Articulo.interface";
import { Prioridad_ArticuloRepository } from "../repositories/Prioridad_Articulo.repository";

export const Prioridad_ArticuloService = {
    getAll: async (): Promise<IPrioridad_Articulo[]> => {
        return await Prioridad_ArticuloRepository.getAll();
    },
    getByID: async (id: number): Promise<IPrioridad_Articulo> => {
        return await Prioridad_ArticuloRepository.getByID(id)
    },
    createPrioridad: async (data: ICreateOrUpdatePrioridad_Artiulo) => {

        return await Prioridad_ArticuloRepository.create(data)
    },
    updatePrioridad: async (id: number, data: ICreateOrUpdatePrioridad_Artiulo) => {
        return await Prioridad_ArticuloRepository.update(id, data)
    },
}