import { IPermisoRol, ICreateOrUpdatePermisoRol } from "../interface/Permiso_Rol.interface"
import Permiso_Rol from "../model/Permiso_Rol"
import { v4 as uuidv4 } from 'uuid';
import { isUUID } from "../../../utils/validaciones";
import { UniqueConstraintError } from "sequelize";
import { dbLocal } from "../../../config/db";


export const PermisoRolRepository = {
    getAll: async (): Promise<IPermisoRol[]> => {
        return Permiso_Rol.findAll();
    },
    ultimoId: async () => {
        return await Permiso_Rol.findOne({
            order: [["id_rol_permiso", "DESC"]]
        });
    },

    getAllRolbyPermiso: async (id_permiso: number) => {
        return Permiso_Rol.findAll({
            where: { id_permiso }
        });
    },


    create: async (data: ICreateOrUpdatePermisoRol) => {
        try {
            return await Permiso_Rol.create({
                id_rol_permiso: uuidv4(),
                ...data
            })
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }
    },
    getById: async (id_rol_permiso: string) => {
        if (isUUID(id_rol_permiso)) {
            return Permiso_Rol.findByPk(id_rol_permiso)
        }
        return null;
    },

    update: async (data: ICreateOrUpdatePermisoRol, id_rol_permiso: string) => {
        const permisoRol = await PermisoRolRepository.getById(id_rol_permiso)
        if (!permisoRol) return null;
        return await permisoRol.update(data)
    },

    getByRolId: async (id_rol: number): Promise<number[]> => {
        const rows = await Permiso_Rol.findAll({ where: { id_rol }, attributes: ['id_permiso'] });
        return rows.map(r => r.id_permiso);
    },

    bulkSet: async (id_rol: number, id_permisos: number[]): Promise<void> => {
        await dbLocal.transaction(async (t) => {
            await Permiso_Rol.destroy({ where: { id_rol }, transaction: t });
            if (id_permisos.length > 0) {
                await Permiso_Rol.bulkCreate(
                    id_permisos.map(id_permiso => ({ id_rol_permiso: uuidv4(), id_rol, id_permiso })),
                    { transaction: t }
                );
            }
        });
    },

}