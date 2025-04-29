import { ICreateEstado, IEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface";
import { EstadoRepository } from "../../repository/Lugares/Estado.repository";
import { isUUID } from "../../utils/validaciones";
import { PaisRepository } from "../../repository/Lugares/Pais.repository";

export const EstadoService = {
    getAllEstados: async (): Promise<IEstado[]> => {
        return await EstadoRepository.getAll();
    },

    getEstadosPorPais: async (id_pais: string): Promise<IEstado[]> => {
        return await EstadoRepository.getEstadosPorPais(id_pais);
    },

    createEstado: async (data: ICreateEstado) => {
        if (
            !data ||
            typeof data.nom_esta !== 'string' ||
            !data.nom_esta.trim() ||
            typeof data.clave_ent_fed_estado !== 'string' ||
            !data.clave_ent_fed_estado.trim() ||
            typeof data.id_pais_esta !== 'string'
        ) {
            throw new Error("Datos inválidos");
        }

        if (!isUUID(data.id_pais_esta) && !isNaN(Number(data.id_pais_esta))) {
            const pais = await PaisRepository.findByIdFlexible(data.id_pais_esta)
            if (!pais) throw new Error("El país proporcionado no existe");
            data.id_pais_esta = pais.id_pais; // Ponerle el UUID
        }


        return await EstadoRepository.create(data);
    },

    getEstadoByID: async (id: string) => {
        const estado = await EstadoRepository.findByIdFlexible(id);
        if (!estado) throw new Error("Estado no encontrado");
        return estado;
    },

    updateEstado: async (id: string, data: IUpdateEstado) => {
        const estadoAActualizar = await EstadoRepository.findByIdFlexible(id)
        if (!estadoAActualizar) throw new Error("No se encontro el pais a actualizar.")
        if (data.id_pais_esta) {
            if (!isUUID(data.id_pais_esta) && !isNaN(Number(data.id_pais_esta))) {
                const pais = await PaisRepository.findByIdFlexible(data.id_pais_esta)
                if (!pais) throw new Error("El país proporcionado no existe");
                data.id_pais_esta = pais.id_pais; // Reemplazar el número por el UUID
            }
        }
        return await estadoAActualizar.update(data)
    },

    cambiarStatus: async (id: string) => {
        const statusActual = await EstadoRepository.statusActualEstado(id);
        if (statusActual === null) throw new Error("Estado no encontrado");

        const nuevoStatus = !statusActual;
        const updatedStatusEstado = await EstadoRepository.cambiarStatus(id, nuevoStatus);
        if (!updatedStatusEstado) throw new Error("No se pudo actualizar el estado.");

        return updatedStatusEstado;
    }
};
