import { ICreateOrUpdateUnidadMedida } from "../../interface/Articulos/UnidadMedida.interface";
import UnidadMedida from "../../models/Articulos/UnidadMedida";

export const UnidadMedidaRepository = {
    getAll: async () => {
        return await UnidadMedida.findAll();
    },
    getByID: async (id: number) => {
        return await UnidadMedida.findByPk(id)
    },
    ultimoId: async () => {
        return await UnidadMedida.findOne({
            order: [["id_medida", "DESC"]]
        })
    },
    createUnidaMedida: async (data: ICreateOrUpdateUnidadMedida) => {

        const UltimoId = await UnidadMedidaRepository.ultimoId();

        const nuevoID = UltimoId ? UltimoId.id_medida + 1 : 1;
        return await UnidadMedida.create({
            id_medida: nuevoID,
            ...data
        })
    },
    updateMedida: async (id: number, data: ICreateOrUpdateUnidadMedida) => {
        const existe = await UnidadMedidaRepository.getByID(id);
        if (!existe) return null;
        return await existe.update(data)
    }
}