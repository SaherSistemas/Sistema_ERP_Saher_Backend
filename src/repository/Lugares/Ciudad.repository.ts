import Ciudad from "../../models/Ubicacion/Ciudad";
import Estado from "../../models/Ubicacion/Estado";
import { ICreateCiudad, ICiudad, IUpdateCiudad } from "../../interface/Lugares/Ciudades.interface";
import { UniqueConstraintError } from "sequelize";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import Colonia from "../../models/Ubicacion/Colonia";
import { EstadoRepository } from "./Estado.repository";

export const CiudadRepository = {
    getAll: async (): Promise<ICiudad[]> => {
        return await Ciudad.findAll({
            include: [{ model: Estado, attributes: ['id_esta', 'nom_esta'] }]
        });
    },

    getCiudadesActivas: async (): Promise<ICiudad[]> => {
        return await Ciudad.findAll({
            where: { activo_ciuda: true }
        });
    },
    getCiudadesPorEstado: async (id_esta: string): Promise<ICiudad[]> => {
        const estado = await EstadoRepository.findByIdFlexible(id_esta)
        if (!estado) return []
        return await Ciudad.findAll({ where: { id_esta_ciuda: estado.id_esta } })
    },

    ultimoID: async () => {
        return await Ciudad.findOne({
            order: [["id_intciuda", "DESC"]]
        });
    },

    findByIdFlexible: async (id: string): Promise<Ciudad | null> => {
        if (isUUID(id)) {
            return await Ciudad.findByPk(id, {
                include: [{ model: Estado, attributes: ['id_esta', 'nom_esta'] }]
            });
        } else if (!isNaN(Number(id))) {
            return await Ciudad.findOne({
                where: { id_intciuda: Number(id) },
                include: [{ model: Estado, attributes: ['id_esta', 'nom_esta'] }]
            });
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
                id_intciuda: nuevoIntID,
                ...data
            });
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }

    },

    updateCiudad: async (id: string, data: IUpdateCiudad) => {
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

    existeColoniaActiva: async (id: string): Promise<boolean> => {
        let ciudadUUID: string;
        if (isUUID(id)) {
            ciudadUUID = id;
        } else if (!isNaN(Number(id))) {
            const ciudad = await Ciudad.findOne({
                where: { id_intciuda: Number(id) }
            })
            if (!ciudad) return false;
            ciudadUUID = ciudad.id_ciuda
        } else {
            throw new Error("ID Invalido")
        }

        const coloniaActiva = await Colonia.findOne({
            where: {
                id_ciuda_colonia: ciudadUUID,
                activa_colonia: true
            }
        })

        return !!coloniaActiva
    }

};
