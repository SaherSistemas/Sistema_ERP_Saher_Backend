import { ICreateColonia, IColonia, IUpdateColonia } from "../../interface/Lugares/Colonia.interface";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";
import { ColoniaRepository } from "../../repository/Lugares/Colonia.respository";
import { isUUID } from "../../utils/validaciones";


export const ColoniaService = {
    getAllCiudad: async (): Promise<IColonia[]> => {
        return await ColoniaRepository.getAll();
    },
    getColoniasActivas: async (): Promise<IColonia[]> => {
        return await ColoniaRepository.getColoniasActivas()
    },
    createColonia: async (data: ICreateColonia) => {
        if (!isUUID(data.id_ciuda_colonia) && !isNaN(Number(data.id_ciuda_colonia))) {
            const ciudad = await CiudadRepository.findByIdFlexible(data.id_ciuda_colonia)
            if (!ciudad) throw new Error("La colonia proporcionada no existe.");
            data.id_ciuda_colonia = ciudad.id_ciuda
        }
        return await ColoniaRepository.create(data)
    },
    getColoniaByID: async (id: string) => {
        const colonia = await ColoniaRepository.findByIdFlexible(id);
        if (!colonia) throw new Error("Colonia no encontrada.")
        return colonia
    },
    updateColonia: async (id: string, data: IUpdateColonia) => {
        if (data.id_ciuda_colonia) {
            if (!isUUID(data.id_ciuda_colonia) && !isNaN(Number(data.id_ciuda_colonia))) {
                const ciudad = await CiudadRepository.findByIdFlexible(id);
                if (!ciudad) throw new Error("La ciudad proporcionada no existe")
                data.id_ciuda_colonia = ciudad.id_ciuda
            }
        }
        return await ColoniaRepository.updateColonia(id, data)
    },

    cambiarStatus: async (id: string) => {
        const statusActual = await ColoniaRepository.statusActualColonia(id);
        if (statusActual === null) throw new Error("Colonia no encontrada.")

        const nuevoStatus = !statusActual;
        const updateStatusCiudad = await ColoniaRepository.cambiarStatus(id, nuevoStatus);
        if (!updateStatusCiudad) throw new Error("No se pudo cambiar el status de la colonia.")

        return updateStatusCiudad
    }
}