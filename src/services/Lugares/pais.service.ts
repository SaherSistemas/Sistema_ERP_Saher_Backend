import { ICreatePais, IPais, IUpdatePais } from "../../interface/Lugares/Pais.interface";
import { PaisRepository } from "../../repository/Lugares/Pais.repository";

export const PaisService = {
    getAllPaises: async (): Promise<IPais[]> => {
        return await PaisRepository.getAll();
    },
    getAllPaisesActivos: async (): Promise<IPais[]> => {
        return await PaisRepository.getAllActivos();
    },

    createPais: async (data: ICreatePais) => {
        if (
            !data ||
            typeof data.nom_pais !== 'string' ||
            !data.nom_pais.trim() ||
            typeof data.cod_iso !== 'string' ||
            !data.cod_iso.trim()
        ) {
            throw new Error("Datos inválidos");
        }
        return await PaisRepository.create(data);
    },

    getPaisById: async (id_pais: string) => {
        const pais = await PaisRepository.findByIdFlexible(id_pais);
        if (!pais) throw new Error("País no encontrado");
        return pais;
    },

    updatePais: async (id_pais: string, data: IUpdatePais) => {
        return await PaisRepository.update(id_pais, data)
    },

    cambiarStatus: async (id_pais: string) => {
        const pais = await PaisRepository.findByIdFlexible(id_pais);
        if (!pais) throw new Error("Pais no encontrado para cambiar estatus.");

        const nuevoStatus = !pais.activo_pais;

        if (!nuevoStatus) {
            const tieneEstadosActivos = await PaisRepository.existeEstadoActivo(id_pais);
            if (tieneEstadosActivos) {
                throw new Error("No se puede desactivar el país porque tiene estados activos");
            }
        }

        const updatedStatusPais = await PaisRepository.cambiarStatus(pais, nuevoStatus);
        if (!updatedStatusPais) throw new Error("No se pudo actualizar el estado.");

        return updatedStatusPais
    }
}
