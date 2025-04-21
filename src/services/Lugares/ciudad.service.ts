import { ICiudad, ICreateCiudad, IUpdatedCiudad } from "../../interface/Lugares/Ciudades.interface";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";


export const CiudadService = {
    getAllCiudad: async (): Promise<ICiudad[]> => {
        return await CiudadRepository.getAll();
    },
    getCiudadesPorEstado: async (id_esta_ciuda: number): Promise<ICiudad[]> => {
        return await CiudadRepository.getCiudadesEstados(id_esta_ciuda)
    },
    getCiudadByID: async (id_ciuda: number) => {
        const ciudad = await CiudadRepository.getById(id_ciuda);

        if (!ciudad) throw new Error("Ciudad no encontrada")
        return ciudad
    },

    createCiudad: async (data: ICreateCiudad) => {
        if (
            !data ||
            typeof data.nom_ciuda !== 'string' ||
            !data.nom_ciuda.trim() ||
            typeof data.id_esta_ciuda !== 'number'
        ) {
            throw new Error("Datos inválidos: 'nombre_ciudad' debe ser string y 'id_estado' debe ser number.");
        }
        const ultimoId = await CiudadRepository.ultimoId();
        const nuevoId = ultimoId ? ultimoId.id_ciuda + 1 : 1;

        return await CiudadRepository.create({ ...data }, nuevoId)
    },

    updatedCiudad: async (id_ciuda: number, data: IUpdatedCiudad) => {
        const updateCiudad = await CiudadRepository.update(id_ciuda, data)
        if (!updateCiudad) throw new Error("No se pudo actualizar la ciudad.")
        return updateCiudad
    },
    cambiarStatus: async (id_ciuda: number) => {
        const statusActual = await CiudadRepository.statusActualCiudad(id_ciuda)

        const nuevoStatus = !statusActual
        const updatedStatusCiudad = await CiudadRepository.cambiarStatus(id_ciuda, nuevoStatus)
        if (!updatedStatusCiudad) throw new Error("No se pudo actualizar la ciudad.")
        return updatedStatusCiudad
    }

}