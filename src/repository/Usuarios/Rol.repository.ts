import { IRol, ICreateOrUpdateRol } from "../../interface/Usuarios/Rol.interface";
import Rol from "../../models/Usuarios/Rol";
import { v4 as uuidv4 } from 'uuid';
import { isUUID } from "../../utils/validaciones";
import { UniqueConstraintError } from "sequelize";

export const RolRepository = {
    getAll: async (): Promise<IRol[]> => {
        return Rol.findAll();
    },
    ultimoId: async () => {
        return await Rol.findOne({
            order: [["id_introl", "DESC"]]
        });
    },
    create: async (data: ICreateOrUpdateRol) => {
        const nuevoUUID = uuidv4();
        const ultimoID = await RolRepository.ultimoId();
        const nuevoIntID = ultimoID ? ultimoID.id_introl + 1 : 1

        try {
            return await Rol.create({
                id_rol: nuevoUUID,
                id_introl: nuevoIntID,
                ...data
            })
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }
    },
    getByIdFlexible: async (id_rol: string) => {
        if (isUUID(id_rol)) {
            return Rol.findByPk(id_rol)
        } else if (!isNaN(Number(id_rol))) {
            return await Rol.findOne({
                where: { id_introl: Number(id_rol) }
            })
        }
        return null
    },
    updateRol: async (data: ICreateOrUpdateRol, uuid_rol: string) => {
        const rol = await RolRepository.getByIdFlexible(uuid_rol)

        if (!rol) return null;
        return await rol.update(data)
    },


}