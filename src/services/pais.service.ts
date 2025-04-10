import { PaisRepository } from "../repository/Pais.repository";

export const PaisService = {
    getAllPaises: async () => {
        return await PaisRepository.getAll();
    },

    createPais: async (nom_pais: string, cod_iso: string) => {
        if (!nom_pais || !cod_iso) {
            throw new Error("Todos los campos son requeridos")
        }
        const ultimoID = PaisRepository.ultimoID();

        const nuevoID = ultimoID ? (await ultimoID).dataValues.id_pais + 1 : 1;

        return await PaisRepository.create(nuevoID, nom_pais, cod_iso)
    },

    getPaisById: async (id_pais: number) => {
        const pais = await PaisRepository.getById(id_pais)
        if (!pais) throw new Error("Pais no encontrado")
        return pais
    },

    updatePais: async (id_pais: number, nom_pais: string, cod_iso: string) => {
        const updatedPais = await PaisRepository.update(id_pais, nom_pais, cod_iso)
        if (!updatedPais) throw new Error("No se pudo actualizar el país")
        return updatedPais
    },

    cambiarStatus: async (id_pais: number) => {
        const updateStatusPais = await PaisRepository.cambiarStatus(id_pais);
        if (!updateStatusPais) throw new Error("No se pudo actualizar el pais");
        return updateStatusPais
    }
}