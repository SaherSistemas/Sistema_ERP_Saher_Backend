import { IPermiso, ICreateOrUpdatePermiso } from "../interface/Permiso.interface"
import Permiso from "../model/Permiso";
import { UniqueConstraintError } from "sequelize";


export const PermisoRepository = {
    getAll: async (): Promise<IPermiso[]> => {
        return Permiso.findAll();
    },
    ultimoId: async () => {
        return await Permiso.findOne({
            order: [["id_permiso", "DESC"]]
        });
    },
    create: async (data: ICreateOrUpdatePermiso) => {
        const ultimoID = await PermisoRepository.ultimoId();
        const nuevoIntID = ultimoID ? ultimoID.id_permiso + 1 : 1

        try {
            return await Permiso.create({
                id_permiso: nuevoIntID,
                ...data
            })
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }
    },
    getById: async (id_permiso: string) => {
        if (id_permiso) {
            return Permiso.findByPk(id_permiso)
        } else if (!isNaN(Number(id_permiso))) {
            return await Permiso.findOne({
                where: { id_permiso: Number(id_permiso) }
            })
        }
        return null
    },
    update: async (data: ICreateOrUpdatePermiso, id_permiso: string) => {
        const permiso = await PermisoRepository.getById(id_permiso)

        if (!permiso) return null;
        return await permiso.update(data)
    },

}