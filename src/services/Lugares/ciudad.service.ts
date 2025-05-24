import { ICiudad, ICreateCiudad, IUpdateCiudad } from "../../interface/Lugares/Ciudades.interface";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";
import { EstadoRepository } from "../../repository/Lugares/Estado.repository";
import { isUUID } from "../../utils/validaciones";


export const CiudadService = {
    getAllCiudad: async (): Promise<ICiudad[]> => {
        return await CiudadRepository.getAll();
    },

    getCiudadesActivas: async (): Promise<ICiudad[]> => {
        return await CiudadRepository.getCiudadesActivas()
    },

    getCiudadesPorEstado: async (id_esta: string): Promise<ICiudad[]> => {
        return await CiudadRepository.getCiudadesPorEstado(id_esta);
    },

    createCiudad: async (data: ICreateCiudad) => {
        if (
            !data ||
            (typeof data.id_esta_ciuda !== 'string' && typeof data.id_esta_ciuda !== 'number') ||
            (typeof data.id_esta_ciuda === 'string' && !data.id_esta_ciuda.trim()) ||
            typeof data.nom_ciuda !== 'string' ||
            !data.nom_ciuda.trim()
        ) {
            throw new Error("Datos inválidos");
        }

        if (!isUUID(data.id_esta_ciuda) && !isNaN(Number(data.id_esta_ciuda))) {
            const estado = await EstadoRepository.findByIdFlexible(data.id_esta_ciuda)
            if (!estado) throw new Error("El país proporcionado no existe");
            data.id_esta_ciuda = estado.id_esta; // Ponerle el UUID
        }
        return await CiudadRepository.create(data);
    },
    getCiudadByID: async (id: string) => {
        const ciudad = await CiudadRepository.findByIdFlexible(id)
        if (!ciudad) throw new Error("Ciudad no encontrada.")
        return ciudad
    },
    updateCiudad: async (id: string, data: IUpdateCiudad) => {
        if (data.id_esta_ciuda) {
            if (!isUUID(data.id_esta_ciuda) && !isNaN(Number(data.id_esta_ciuda))) {
                const estado = await EstadoRepository.findByIdFlexible(data.id_esta_ciuda)
                if (!estado) throw new Error("El estado proporcionado no existe.")
                data.id_esta_ciuda = estado.id_esta
            }
        }
        return await CiudadRepository.updateCiudad(id, data)
    },
    cambiarStatus: async (id: string) => {
        const ciudad = await CiudadRepository.findByIdFlexible(id);
        if (!ciudad) throw new Error("Ciudad no encontrada")
        const nuevoStatus = !ciudad.activo_ciuda

        if (!nuevoStatus) {
            const tieneColoniasActivas = await CiudadRepository.existeColoniaActiva(id);

            if (tieneColoniasActivas) {
                throw new Error("No se puede desactivar la ciudad porque tiene colonias activas")
            }
        }
        const updatedStatusCiudad = await CiudadRepository.cambiarStatus(id, nuevoStatus);
        if (!updatedStatusCiudad) throw new Error("No se pudo actualizar la ciudad.");

        return updatedStatusCiudad
    }

}