import Estado from "../../models/Ubicacion/Estado";
import { ICreateEstado, IEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface";
import { isUUID } from "../../utils/validaciones";
import { UniqueConstraintError } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import Pais from "../../models/Ubicacion/Pais";
import Ciudad from "../../models/Ubicacion/Ciudad";

export const EstadoRepository = {
    getAll: async (): Promise<IEstado[]> => {
        return await Estado.findAll();
    },

    getEstadosPorPais: async (id_pais: string): Promise<IEstado[]> => {
        const isIdUUID = isUUID(id_pais);

        let paisUUID = id_pais;
        if (!isIdUUID) {
            const pais = await Pais.findOne({ where: { id_intpais: Number(id_pais) } });
            if (!pais) return [];
            paisUUID = pais.id_pais;
        }

        return await Estado.findAll({ where: { id_pais_esta: paisUUID } });
    },

    ultimoID: async () => {
        return await Estado.findOne({
            order: [["id_intesta", "DESC"]]
        });
    },

    create: async (data: ICreateEstado) => {
        const nuevoUUID = uuidv4();
        const ultimoID = await EstadoRepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_intesta + 1 : 1;

        try {
            return await Estado.create({
                id_esta: nuevoUUID,
                id_intesta: nuevoIntID,
                ...data
            });
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }
    },

    findByIdFlexible: async (id: string) => {
        if (isUUID(id)) {
            return await Estado.findByPk(id);
        } else if (!isNaN(Number(id))) {
            return await Estado.findOne({
                where: { id_intesta: Number(id) }
            });
        }
        return null;
    },

    update: async (id: string, data: IUpdateEstado) => {
        const estado = await EstadoRepository.findByIdFlexible(id);
        if (!estado) return null;
        return await estado.update(data);
    },

    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const estado = await EstadoRepository.findByIdFlexible(id);
        if (!estado) return null;
        return await estado.update({ activo_estado: statusContrario });
    },

    statusActualEstado: async (id: string) => {
        const estado = await EstadoRepository.findByIdFlexible(id);
        if (!estado) return null;
        return estado.activo_estado;
    },

    existeCiudadActiva: async (id_estado: string): Promise<boolean> => {
        let estadoUUID: string;

        if (isUUID(id_estado)) {
            estadoUUID = id_estado;
        } else if (!isNaN(Number(id_estado))) {
            // Buscar el estado usando id_intesta
            const estado = await Estado.findOne({
                where: { id_intesta: Number(id_estado) }
            });
            if (!estado) return false;
            estadoUUID = estado.id_esta;
        } else {
            throw new Error("ID inválido: no es UUID ni número.");
        }

        const ciudadActiva = await Ciudad.findOne({
            where: {
                id_estado_ciudad: estadoUUID,
                activo_ciudad: true
            }
        });

        return !!ciudadActiva;
    }
};
