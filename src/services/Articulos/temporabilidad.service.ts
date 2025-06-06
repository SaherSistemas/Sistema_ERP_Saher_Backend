import { TemporabilidadRepository } from "../../repository/Articulos/Temporabilidad.repository";
import { ICreateOrUpdateTemporabilidad } from "../../interface/Articulos/Temporabilidad.interface";

export const TemporabilidadService = {
    getAll: async () => {
        return await TemporabilidadRepository.getAll();
    },
    getByID: async (id: number) => {
        return await TemporabilidadRepository.getByID(id)
    },
    createTemporabilidad: async (data: ICreateOrUpdateTemporabilidad) => {

        return await TemporabilidadRepository.create(data)
    },
    updateTemporabilidad: async (id: number, data: ICreateOrUpdateTemporabilidad) => {
        return await TemporabilidadRepository.update(id, data)
    },
}