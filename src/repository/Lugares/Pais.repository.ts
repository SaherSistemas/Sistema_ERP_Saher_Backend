import { ICreatePais, IPais, IUpdatePais } from '../../interface/Lugares/Pais.interface';
import Estado from '../../models/Ubicacion/Estado';
import Pais from '../../models/Ubicacion/Pais';
import { v4 as uuidv4 } from 'uuid';
import { isUUID } from '../../utils/validaciones'; // ✅ Importar aquí

export const PaisRepository = {
    getAll: async (): Promise<IPais[]> => {
        return await Pais.findAll();
    },

    ultimoID: async () => {
        return await Pais.findOne({
            order: [["id_intpais", "DESC"]]
        });
    },

    create: async (data: ICreatePais) => {
        const nuevoUUID = uuidv4();
        const ultimoID = await PaisRepository.ultimoID();
        const nuevoIntID = ultimoID ? ultimoID.id_intpais + 1 : 1;

        return await Pais.create({
            id_pais: nuevoUUID,
            id_intpais: data.id_intpais ?? nuevoIntID,
            ...data
        });
    },

    findByIdFlexible: async (id: string): Promise<Pais | null> => {
        if (isUUID(id)) {
            return await Pais.findByPk(id);
        } else if (!isNaN(Number(id))) {
            return await Pais.findOne({
                where: {
                    id_intpais: Number(id)
                }
            });
        } else {
            return null;
        }
    },

    update: async (id: string, data: IUpdatePais) => {
        const pais = await PaisRepository.findByIdFlexible(id);
        if (!pais) return null;
        return await pais.update(data);
    },

    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const pais = await PaisRepository.findByIdFlexible(id);
        if (!pais) return null;
        return await pais.update({ activo_pais: statusContrario });
    },

    statusPais: async (id: string) => {
        const pais = await PaisRepository.findByIdFlexible(id);
        if (!pais) return null;
        return pais.activo_pais;
    },

    existeEstadoActivo: async (id: string): Promise<boolean> => {
        let paisUUID: string;

        if (isUUID(id)) {
            paisUUID = id;
        } else if (!isNaN(Number(id))) {
            const pais = await Pais.findOne({
                where: { id_intpais: Number(id) }
            });
            if (!pais) return false;
            paisUUID = pais.id_pais;
        } else {
            throw new Error("ID inválido: no es UUID ni número.");
        }

        const estadoActivo = await Estado.findOne({
            where: {
                id_pais_esta: paisUUID,
                activo_estado: true
            }
        });

        return !!estadoActivo;
    }
};
