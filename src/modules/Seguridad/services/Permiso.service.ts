import { IPermiso, ICreateOrUpdatePermiso } from "../interface/Permiso.interface"
import { PermisoRepository } from "../repositories/Permiso.repository"



export const PermisoService = {
    getAll: async (): Promise<IPermiso[]> => {
        return await PermisoRepository.getAll();
    },
    getByID: async (id_permiso: string) => {
        const permiso = await PermisoRepository.getById(id_permiso)
        if (!id_permiso) throw new Error("ID no encontrado")
        return permiso;
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
        if (!data) throw new Error("Datos invalidos.")
        return await PermisoRepository.update(data, id_permiso)
    },
    delete: async (id_permiso: number) => {
        const permiso = await PermisoRepository.getById(String(id_permiso));
        if (!permiso) throw new Error('Permiso no encontrado');
        await permiso.destroy();
    }
}