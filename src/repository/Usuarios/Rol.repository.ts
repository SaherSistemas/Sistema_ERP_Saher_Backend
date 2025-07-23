import { IRol, ICreateOrUpdateRol } from "../../interface/Usuarios/Rol.interface";
import Rol from "../../models/Usuarios/Rol";
import { UniqueConstraintError } from "sequelize";

export const RolRepository = {
    getAll: async (): Promise<IRol[]> => {
        return Rol.findAll();
    },
    ultimoId: async () => {
        return await Rol.findOne({
            order: [["id_rol", "DESC"]]
        });
    },
    create: async (data: ICreateOrUpdateRol) => {
        const ultimoID = await RolRepository.ultimoId();
        const nuevoIntID = ultimoID ? ultimoID.id_rol + 1 : 1

        try {
            return await Rol.create({
                id_rol: nuevoIntID,
                ...data
            })
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; 
        }
    },
    getByIdFlexible: async (id_rol: string) => {
        if (id_rol) {
            return Rol.findByPk(id_rol)
        } else if (!isNaN(Number(id_rol))) {
            return await Rol.findOne({
                where: { id_rol: Number(id_rol) }
            })
        }
        return null
    },
    updateRol: async (data: ICreateOrUpdateRol, id_rol: number) => {
        const rol = await RolRepository.getByIdFlexible(id_rol.toString())

        if (!rol) return null;
        return await rol.update(data)
    }
}