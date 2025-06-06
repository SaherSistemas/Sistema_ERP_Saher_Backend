import Temporabilidad from "../../models/Articulos/Temporabilidad";
import { ICreateOrUpdateTemporabilidad, ITemporabilidad } from "../../interface/Articulos/Temporabilidad.interface";

export const TemporabilidadRepository = {
    getAll: async () => {
        return await Temporabilidad.findAll();
    },
    getByID: async (id_tempo: number) => {
        return await Temporabilidad.findByPk(id_tempo)
    },
    ultimoID: async () => {
        return await Temporabilidad.findOne({
            order: [["id_tempo", "DESC"]]
        })
    },
    create: async (data: ICreateOrUpdateTemporabilidad) => {
        const ultimoID = await TemporabilidadRepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_tempo + 1 : 1;

        return await Temporabilidad.create({
            id_tempo: nuevoIntID,
            ...data
        })
    },
    update: async (id_tempo: number, data: ICreateOrUpdateTemporabilidad) => {
        const existe = await TemporabilidadRepository.getByID(id_tempo);
        if (!existe) return null;
        return await existe.update(data)
    }
}