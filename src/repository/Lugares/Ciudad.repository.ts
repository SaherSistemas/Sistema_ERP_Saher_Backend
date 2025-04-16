import { ICiudad, ICreateCiudad, IUpdatedCiudad } from "../../interface/Lugares/Ciudades.interface";
import Ciudad from "../../models/Ubicacion/Ciudad";


export const CiudadRepository = {
    getAll: async (): Promise<ICiudad[]> => {
        return await Ciudad.findAll();
    },
    getCiudadesEstados: async (id_esta_ciuda: number): Promise<ICiudad[]> => {
        return await Ciudad.findAll({ where: { id_esta_ciuda } })
    },
    ultimoId: async () => {
        return await Ciudad.findOne({
            order: [["id_ciuda", "DESC"]]
        })
    },
    create: async (data: ICreateCiudad, nuevoID: number) => {
        return await Ciudad.create({
            id_ciuda: nuevoID,
            ...data
        })
    },

    getById: async (id_ciuda: number) => {
        return await Ciudad.findByPk(id_ciuda)
    },

    update: async (id_ciuda: number, data: IUpdatedCiudad) => {
        const ciudad = await Ciudad.findByPk(id_ciuda)
        if (!ciudad) return null;

        return await ciudad.update(data)
    },

    cambiarStatus: async (id_ciuda: number, statusContrario: boolean) => {
        const ciudad = await Ciudad.findByPk(id_ciuda);
        if (!ciudad) return null
        return await ciudad.update({ activo_ciuda: statusContrario })
    },

    statusActualCiudad: async (id_ciuda: number) => {
        const ciudad = await Ciudad.findByPk(id_ciuda)
        if (!ciudad) return null

        return ciudad.activo_ciuda
    }


}