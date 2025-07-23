import Tipo_Articulo from "../../models/Articulos/Tipo_Articulo";
import { ICreateOrUpdateTipo_Articulo, ITipo_Articulo } from "../../interface/Articulos/Tipo_Articulo.interface";
import { v4 as uuidv4 } from 'uuid';
export const Tipo_ArticuloRepository = {
    getAll: async () => {
        return await Tipo_Articulo.findAll();
    },
    getByID: async (id: string) => {
        return await Tipo_Articulo.findByPk(id)
    },
    create: async (data: ICreateOrUpdateTipo_Articulo) => {
        const nuevoUUID = uuidv4();

        return await Tipo_Articulo.create({
            id_tipo_art: nuevoUUID,
            ...data
        })
    },
    update: async (id: string, data: ICreateOrUpdateTipo_Articulo) => {
        const existe = await Tipo_ArticuloRepository.getByID(id);
        if (!existe) return null;
        return await existe.update(data)
    }
}