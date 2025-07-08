import { IPermiso, ICreateOrUpdatePermiso} from "../../interface/Usuarios/Permiso.interface"
import { PermisoRepository} from "../../repository/Usuarios/Permiso.repository"



export const PermisoService = {
    getAll: async (): Promise<IPermiso[]> => {
        return await PermisoRepository.getAll();
    },
    getByID: async (id_permiso: string) => {
        const rol = await PermisoRepository.getById(id_permiso)
        if (!id_permiso) throw new Error("ID no encontrado")
        return rol;
    },
    create: async (data: ICreateOrUpdatePermiso) => {
        if (
            !data
        ) {
            throw new Error("Datos invalidos.")
        }
        return await PermisoRepository.create(data)
    },
    update: async (id_permiso: string, data: ICreateOrUpdatePermiso) => {
        if (
            !data 
        ) {
            throw new Error("Datos invalidos.")
        }
        return await PermisoRepository.update(data, id_permiso)
    }
}