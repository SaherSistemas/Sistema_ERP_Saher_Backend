import { ICreateOrUpdateRol, IRol } from "../../interface/Usuarios/Rol.interface";
import { RolRepository } from "../../repository/Usuarios/Rol.repository";


export const RolService = {
    getAllRol: async (): Promise<IRol[]> => {
        return await RolRepository.getAll();
    },
    getRolByID: async (id: number) => {
        const rol = await RolRepository.getByIdFlexible(id.toString())
        if (!rol) throw new Error("Rol no encontrado")
        return rol;
    },
    createRol: async (data: ICreateOrUpdateRol) => {
        if (
            !data ||
            (typeof data.nom_rol !== 'string' ||
                !data.nom_rol.trim()
            )
        ) {
            throw new Error("Datos invalidos.")
        }
        return await RolRepository.create(data)
    },
    updateRol: async (id: number, data: ICreateOrUpdateRol) => {
        if (!data ||
            (typeof data.nom_rol !== 'string' ||
                !data.nom_rol.trim()
            )
        ) {
            throw new Error("Datos invalidos.")
        }
        return await RolRepository.updateRol(data, id)
    }
}