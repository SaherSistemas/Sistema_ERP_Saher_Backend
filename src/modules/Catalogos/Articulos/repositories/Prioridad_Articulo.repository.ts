import Prioridad_Articulo from "../model/Prioridad_Articulo";
import { ICreateOrUpdatePrioridad_Artiulo, IPrioridad_Articulo } from "../interface/Prioridad_Articulo.interface";

export const Prioridad_ArticuloRepository = {
    getAll: async () => {
        return await Prioridad_Articulo.findAll();
    },
    getByID: async (id: number) => {
        return await Prioridad_Articulo.findByPk(id);
    },
    ultimoID: async () => {
        return await Prioridad_Articulo.findOne({
            order: [["id_prioridad", "DESC"]]
        });
    },
    create: async (data: ICreateOrUpdatePrioridad_Artiulo) => {
        const ultimoID = await Prioridad_ArticuloRepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_prioridad + 1 : 1;


        return await Prioridad_Articulo.create({
            id_prioridad: nuevoIntID,
            ...data
        }
        )
    },
    update: async (id: number, data: ICreateOrUpdatePrioridad_Artiulo) => {
        const existe = await Prioridad_ArticuloRepository.getByID(id);
        if (!existe) return null;
        return await existe.update(data)
    }

}