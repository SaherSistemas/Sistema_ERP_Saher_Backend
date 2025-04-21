import { ICreateEstado, IEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface";
import { EstadoRepository } from "../../repository/Lugares/Estado.repository";

export const EstadoService = {
    getAllEstados: async (): Promise<IEstado[]> => {
        return await EstadoRepository.getAll();
    },
    getEstadosPorPais: async (id_pais_esta: number): Promise<IEstado[]> => {
        return await EstadoRepository.getEstadosPorPais(id_pais_esta);
    },
    createEstado: async (data: ICreateEstado) => {
        //VALIDAR SI ESTAN VACIOS
        if (
            !data ||
            typeof data.nom_esta !== 'string' ||
            !data.nom_esta.trim() ||
            typeof data.clave_ent_fed_estado !== 'string' ||
            !data.clave_ent_fed_estado.trim() ||
            typeof data.id_pais_esta !== 'number'
        ) {
            throw new Error("Datos inválidos");
        }
        const ultimoID = await EstadoRepository.ultimoID();
        const nuevoID = ultimoID ? ultimoID.id_esta + 1 : 1;
        return await EstadoRepository.create({ ...data }, nuevoID)
    },
    getEstadoByID: async (id_esta: number) => {
        const estado = await EstadoRepository.getById(id_esta)
        if (!estado) throw new Error("Estado no encontrado")
        return estado
    },

    updateEstado: async (id_esta: number, data: IUpdateEstado) => {
        const updateEstado = await EstadoRepository.update(id_esta, data)
        if (!updateEstado) throw new Error("No se pudo actualizar el estado")
        return updateEstado
    },

    cambiarStatus: async (id_esta: number) => {
        const statusActual = await EstadoRepository.statusActualEstado(id_esta)
        const nuevoStatus = !statusActual

        const updatedStatusEstado = await EstadoRepository.cambiarStatus(id_esta, nuevoStatus);
        if (!updatedStatusEstado) throw new Error("No se pudo actualizar el estado.")

        return updatedStatusEstado
    }
}