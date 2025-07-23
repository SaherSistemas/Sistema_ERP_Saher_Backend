import { ICreateOrUpdatePresentacion_Articulo } from "../../interface/Articulos/Presentacion_Articulo.interface";
import Presentacion_Articulo from "../../models/Articulos/Presentacion_Articulo";
import { v4 as uuidv4 } from 'uuid';
export const Presentacion_ArticuloRepository = {
    getAll: async () => {
        return await Presentacion_Articulo.findAll();
    },
    getByID: async (id: string) => {
        return await Presentacion_Articulo.findByPk(id)
    },
    createPresentacion_Articulo: async (data: ICreateOrUpdatePresentacion_Articulo) => {
        const nuevoUUID = uuidv4();
        return await Presentacion_Articulo.create({
            id_presentacion: nuevoUUID,
            ...data
        })
    },
    updatePresentacion_Articulo: async (id: string, data: ICreateOrUpdatePresentacion_Articulo) => {
        const existe = await Presentacion_ArticuloRepository.getByID(id);
        if (!existe) return null;
        return await existe.update(data)
    }
}