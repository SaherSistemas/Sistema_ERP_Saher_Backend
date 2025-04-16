import Estado from "../../models/Ubicacion/Estado"
import { ICreateEstado, IEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface"

export const EstadoRepository = {
    getAll: async (): Promise<IEstado[]> => {
        return await Estado.findAll();
    },
    getEstadosPorPais: async (id_pais_esta: number): Promise<IEstado[]> => {
        return await Estado.findAll({ where: { id_pais_esta } })
    },

    ultimoID: async () => {
        return await Estado.findOne({
            order: [["id_esta", "DESC"]]
        })
    },
    create: async (data: ICreateEstado, nuevoId: number) => {
        return await Estado.create({
            id_esta: nuevoId,
            ...data
        })
    },

    getById: async (id_esta: number) => {
        return await Estado.findByPk(id_esta)
    },

    update: async (id_esta: number, data: IUpdateEstado) => {
        const estado = await Estado.findByPk(id_esta);

        if (!estado) return null

        return await estado.update(data)
    },
    cambiarStatus: async (id_esta: number, statusContrario: boolean) => {
        const estado = await Estado.findByPk(id_esta)
        if (!estado) return null;
        return await estado.update({ activo_estado: statusContrario })
    },

    statusActualEstado: async (id_esta: number) => {
        const estado = await Estado.findByPk(id_esta);
        if (!estado) return null;

        return estado.activo_estado
    }
}