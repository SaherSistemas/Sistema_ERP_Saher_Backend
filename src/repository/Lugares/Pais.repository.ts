import { ICreatePais, IPais, IUpdatePais } from '../../interface/Lugares/Pais.interface';
import Pais from '../../models/Ubicacion/Pais'

export const PaisRepository = {
    getAll: async (): Promise<IPais[]> => {
        return await Pais.findAll();
    },

    ultimoID: async () => {
        return await Pais.findOne({
            order: [["id_pais", "DESC"]]
        })
    },

    create: async (data: ICreatePais, nuevoId: number) => {
        return await Pais.create({
            id_pais: nuevoId,
            ...data
        })
    },

    getById: async (id_pais: number) => {
        return await Pais.findByPk(id_pais)
    },

    update: async (id_pais: number, data: IUpdatePais) => {
        const pais = await Pais.findByPk(id_pais)

        if (!pais) return null;

        return await pais.update(data)
    },

    cambiarStatus: async (id_pais: number, statusContrario: boolean) => {
        const pais = await Pais.findByPk(id_pais);

        if (!pais) return null;

        return await pais.update({ activo_pais: statusContrario })
    },

    statusPais: async (id_pais: number) => {
        const pais = await Pais.findByPk(id_pais);
        if (!pais) return null;

        return pais.activo_pais;
    }


}