import { ClasificacionRepository } from "../../repository/Articulos/Clasificacion.repository";

export const ClasificacionService = {
    getAllClasificacion: async () => {
        return await ClasificacionRepository.getAll();
    },

    createClasificacion: async () => {

    }
}