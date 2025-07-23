import Tipo_IVA from "../../models/Articulos/Tipo_IVA";
import { ITipo_IVA, ICreateOrUpdateTipo_IVA } from "../../interface/Articulos/Tipo_IVA.interface";

export const Tipo_IVARepository = {
    getAll: async (): Promise<ITipo_IVA[]> => {
        return await Tipo_IVA.findAll();
    },
    getByID: async (id: number) => {
        return await Tipo_IVA.findByPk(id)
    },
    ultimoID: async () => {
        return await Tipo_IVA.findOne({
            order: [["id_iva", "DESC"]]
        });
    },
    create: async (data: ICreateOrUpdateTipo_IVA) => {
        const ultimoID = await Tipo_IVARepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_iva + 1 : 1;

        return await Tipo_IVA.create({
            id_iva: nuevoIntID,
            ...data
        })
    },
    update: async (id: number, data: ICreateOrUpdateTipo_IVA) => {
        const existe = await Tipo_IVARepository.getByID(id);
        if (!existe) return null;
        return await existe.update(data)
    }
}