import { ICrearEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { IRol, ICreateOrUpdateRol } from "../../interface/Usuarios/Rol.interface";
import Rol from "../../models/Usuarios/Rol";

export const RolRepository = {
    getAll: async (): Promise<IRol[]> => {
        return Rol.findAll();
    },
    getById: async (id_rol: string) => {
        return Rol.findByPk(id_rol)
    },
    crearRolNuevo: async (data: ICrearEmpleado, uuid_rol: string) => {
        return await Rol.create({
            id_rol: uuid_rol,
            ...data
        })
    },
    modificarRol: async (data: ICrearEmpleado, uuid_rol: string) => {
        const rol = await Rol.findByPk(uuid_rol)

        if (!rol) return null;
        const updateRol = await rol.update(data)
    },


}