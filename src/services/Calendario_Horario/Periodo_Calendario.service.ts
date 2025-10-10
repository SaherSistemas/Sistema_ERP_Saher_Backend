import { ICreateOrUpdatePeriodo_Calendario } from "../../interface/Calendario_horario/Periodo_Calendario.interface";
import { Periodo_CalendarioRepository } from "../../repository/Calendario_Horario/Periodo_Calendario.reposiroty";
import { Transaction } from "sequelize";

export const Periodo_CalendarioService = {
    getAll: async () => {
        return await Periodo_CalendarioRepository.getAll();
    },

    getById: async (id_periodo: string) => {
        return await Periodo_CalendarioRepository.getById(id_periodo);
    },

    getActivo: async () => {
        return await Periodo_CalendarioRepository.getActivo();
    },

    activarPeriodo: async (id_periodo: string) => {
        return await Periodo_CalendarioRepository.activarPeriodo(id_periodo);
    },

    cerrarPeriodo: async (id_periodo: string) => {
        return await Periodo_CalendarioRepository.cerrarPeriodo(id_periodo);
    },

    duplicarPeriodo: async (id_periodo: string, data: ICreateOrUpdatePeriodo_Calendario) => {
        return await Periodo_CalendarioRepository.duplicarPeriodo(id_periodo, data);
    },

    create: async (data: ICreateOrUpdatePeriodo_Calendario) => {
        return await Periodo_CalendarioRepository.create(data);
    },

    update: async (id_periodo: string, data: ICreateOrUpdatePeriodo_Calendario) => {
        return await Periodo_CalendarioRepository.update(id_periodo, data);
    },

    delete: async (id_periodo: string) => {
        const periodo = await Periodo_CalendarioRepository.getById(id_periodo);
        if (!periodo) 
            throw new Error("Periodo no encontrado");
        
        if (periodo.estado !== "borrador") 
            throw new Error("No se puede eliminar un periodo que no está en estado 'borrador'");
        
        await Periodo_CalendarioRepository.delete(id_periodo);
        return true;
    },

    }