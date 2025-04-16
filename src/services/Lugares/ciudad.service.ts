import { ICiudad, ICreateCiudad } from "../../interface/Lugares/Ciudades.interface";
import { IUpdateEstado } from "../../interface/Lugares/Estado.interface";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";


export const CiudadService = {
    getAllCiudad: async (): Promise<ICiudad[]> => {
        return await CiudadRepository.getAll();
    },
    getCiudadesPorEstado: async (id_esta_ciuda: number): Promise<ICiudad[]> => {
        return await CiudadRepository.getCiudadesEstados(id_esta_ciuda)
    },
    createCiudad: async (data: ICreateCiudad) => {
        //VALIDA SI NO ESTA VACIO

        const ultimoId = await CiudadRepository.ultimoId();
        const nuevoId = ultimoId ? ultimoId.id_ciuda + 1 : 1;

        return await CiudadRepository.create({ ...data }, nuevoId)
    },
    getCiudadByID: async (id_ciuda: number) => {
        const ciudad = await CiudadRepository.getById(id_ciuda);

        if (!ciudad) throw new Error("Ciudad no encontrada")
        return ciudad
    },

}