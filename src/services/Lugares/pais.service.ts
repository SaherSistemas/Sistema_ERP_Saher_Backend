import { ICreatePais, IPais, IUpdatePais } from "../../interface/Lugares/Pais.interface";
import { PaisRepository } from "../../repository/Lugares/Pais.repository";
export const PaisService = {
    getAllPaises: async (): Promise<IPais[]> => {
        return await PaisRepository.getAll();
    },

    createPais: async (data: ICreatePais) => {
        //VALIDAR SI ESTAN VACIOS 

        const ultimoID = await PaisRepository.ultimoID();
        const nuevoID = ultimoID ? ultimoID.id_pais + 1 : 1;

        return await PaisRepository.create({ ...data }, nuevoID)
    },

    getPaisById: async (id_pais: number) => {
        const pais = await PaisRepository.getById(id_pais)
        if (!pais) throw new Error("Pais no encontrado")
        return pais
    },

    updatePais: async (id_pais: number, data: IUpdatePais) => {
        const updatedPais = await PaisRepository.update(id_pais, data)
        if (!updatedPais) throw new Error("No se pudo actualizar el país")
        return updatedPais
    },

    cambiarStatus: async (id_pais: number) => {
        const statusActual = await PaisRepository.statusPais(id_pais)

        const nuevoStatus = !statusActual
        const updateStatusPais = await PaisRepository.cambiarStatus(id_pais, nuevoStatus);
        if (!updateStatusPais) throw new Error("No se pudo actualizar el pais");
        return updateStatusPais
    }
}