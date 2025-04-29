import Ciudad from "../../models/Ubicacion/Ciudad";
import Estado from "../../models/Ubicacion/Estado";
import { ICreateCiudad, ICiudad, IUpdateCiudad } from "../../interface/Lugares/Ciudades.interface";
import { UniqueConstraintError } from "sequelize";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';

export const CiudadRepository = {
    getAll: async (): Promise<ICiudad[]> => {
        return await Ciudad.findAll();
    },

    getCiudadesPorEstado: async (id_estado: string): Promise<ICiudad[]> => {
        const isIdUUID = isUUID(id_estado)

        let estadoUUID = id_estado;
        if (!isIdUUID) {
            const estado = await Estado.findOne({ where: { id_intesta: Number(id_estado) } })
            if (!estado) return []
            estadoUUID = estado.id_esta;
        }

        return await Ciudad.findAll({
            where: { id_esta_ciuda: estadoUUID }
        });
    },

    ultimoID: async () => {
        return await Ciudad.findOne({
            order: [["id_inteciuda", "DESC"]]
        });
    },

    findByIdFlexible: async (id: string): Promise<Ciudad | null> => {
        if (isUUID(id)) {
            return await Ciudad.findByPk(id);
        } else if (!isNaN(Number(id))) {
            return await Ciudad.findOne({ where: { id_inteciuda: Number(id) } });
        }
        return null;
    },

    create: async (data: ICreateCiudad) => {
        const nuevoUUID = uuidv4();
        const ultimoID = await CiudadRepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_intciuda + 1 : 1;
        try {
            return await Ciudad.create({
                id_ciuda: nuevoUUID,
                id_inteciuda: nuevoIntID,
                ...data
            });
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }

    },

    update: async (id: string, data: IUpdateCiudad) => {
        const ciudad = await CiudadRepository.findByIdFlexible(id);
        if (!ciudad) return null;
        return await ciudad.update(data);
    },

    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const ciudad = await CiudadRepository.findByIdFlexible(id);
        if (!ciudad) return null;
        return await ciudad.update({ activo_ciuda: statusContrario });
    },

    statusActualCiudad: async (id: string) => {
        const ciudad = await CiudadRepository.findByIdFlexible(id);
        if (!ciudad) return null;
        return ciudad.activo_ciuda;
    },

};
