import { IReglaAgenteCreate } from "../interface/Prioridad_Agente_Reglas.interface";
import { PrioridadAgenteReglasRepository } from "../repositories/Prioridad_Agente_Reglas.repository";

export const PrioridadAgenteReglasService = {
  getByAgente: async (id_agente: string) => {
    return PrioridadAgenteReglasRepository.getByAgente(id_agente);
  },

  create: async (data: IReglaAgenteCreate) => {
    return PrioridadAgenteReglasRepository.create(data);
  },

  update: async (id_regla: string, data: any) => {
    return PrioridadAgenteReglasRepository.update(id_regla, data);
  },

  delete: async (id_regla: string) => {
    return PrioridadAgenteReglasRepository.delete(id_regla);
  }
};
