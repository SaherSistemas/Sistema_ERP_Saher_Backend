import { IPermisoRol, ICreateOrUpdatePermisoRol} from "../../interface/Usuarios/Permiso_Rol.interface"
import { PermisoRolRepository} from "../../repository/Usuarios/Permiso_Rol.repository"
import { RolService } from "./Rol.service";



export const PermisoRolService = {
    getAll: async (): Promise<IPermisoRol[]> => {
        console.log(PermisoRolRepository.getAll);
        return await PermisoRolRepository.getAll();
    },
    getByID: async (id_rol_permiso: string) => {
        const permiso_rol = await PermisoRolRepository.getById(id_rol_permiso)
        if (!permiso_rol) {
            throw new Error("ID no encontrado")
        }
        return permiso_rol;
    },

    getAllRolbyPermiso:async (id_permiso:number) =>{
        const rol = await PermisoRolRepository.getAllRolbyPermiso(id_permiso);
        if(!rol || rol.length == 0){
            throw new Error("No se encontraron roles con ese permiso");
        }
        return rol;
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