import Pais from '../models/Ubicacion/Pais'

export const PaisRepository = {
    getAll: async () => {
        return await Pais.findAll();
    },

    create: async (nuevoId: number, nom_pais: string, cod_iso: string) => {
        return await Pais.create({
            id_pais: nuevoId,
            nom_pais,
            cod_iso
        })
    },
    getById: async (id_pais: number) => {
        return await Pais.findByPk(id_pais)
    },

    ultimoID: async () => {
        return await Pais.findOne({
            order: [["id_pais", "DESC"]]
        })
    },
    update: async (id_pais: number, nom_pais: string, cod_iso: string) => {
        const pais = Pais.findByPk(id_pais)

        if (!pais) return null;

        return (await pais).update({ nom_pais, cod_iso })
    },

    cambiarStatus: async (id_pais: number) => {
        const pais = await Pais.findByPk(id_pais);

        if (!pais) return null;

        const estatusContrario = !(await PaisRepository.statusPais(id_pais));
        return await pais.update({ activo_pais: estatusContrario })
    },

    statusPais: async (id_pais: number) => {
        const pais = await Pais.findByPk(id_pais);
        if (!pais) return null;

        return pais.activo_pais;
    }


}