import { IReglaAgenteCreate } from "../../../interface/Usuarios/Agente_De_Ventas/Prioridad_Agente_Reglas.interface";
import { PrioridadAgenteReglasRepository } from "../../../repository/Usuarios/Agente_De_Ventas/Prioridad_Agente_Reglas.repository";

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
