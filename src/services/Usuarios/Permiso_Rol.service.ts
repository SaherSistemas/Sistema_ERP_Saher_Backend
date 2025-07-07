import { IPermisoRol, ICreateOrUpdatePermisoRol} from "../../interface/Usuarios/Permiso_Rol.interface"
import { PermisoRolRepository} from "../../repository/Usuarios/Permiso_Rol.repository"



export const PermisoRolService = {
    getAll: async (): Promise<IPermisoRol[]> => {
        console.log(PermisoRolRepository.getAll);
        return await PermisoRolRepository.getAll();
    },
    getByID: async (id_rol_permiso: string) => {
        const permiso_rol = await PermisoRolRepository.getById(id_rol_permiso)
        if (!id_rol_permiso) throw new Error("ID no encontrado")
        return id_rol_permiso;
    },
    create: async (data: ICreateOrUpdatePermisoRol) => {
        if (
            !data
        ) {
            throw new Error("Datos invalidos.")
        }
        return await PermisoRolRepository.create(data)
    },
    update: async (id_rol_permiso: string, data: ICreateOrUpdatePermisoRol) => {
        if (
            !data 
        ) {
            throw new Error("Datos invalidos.")
        }
        return await PermisoRolRepository.update(data, id_rol_permiso)
    }
}