import Clasificacion from "../../models/Articulos/Clasificacion";

export const ClasificacionRepository = {
    getAll: async () => {
        return await Clasificacion.findAll();
    },

    create: async (id_clasifi: string, descrip_clasifi: string, margen_clasifi: number) => {
        return await Clasificacion.create({
            id_clasifi,
            descrip_clasifi,
            margen_clasifi
        })
    }
}