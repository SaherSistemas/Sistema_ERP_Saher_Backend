import { v4 } from 'uuid';
import Prioridad_Agente_Reglas from '../../../models/Usuarios/Agente_De_Ventas/Prioridad_Agente_Regla';

export const PrioridadAgenteReglasRepository = {
  getByAgente: async (id_agente: string) => {
    return Prioridad_Agente_Reglas.findAll({
      where: { id_agente },
      order: [['dia_semana', 'ASC']]
    });
  },

  create: async (data: any) => {
    return Prioridad_Agente_Reglas.create({
      id_regla_agente: v4(),
      ...data
    });
  },

  update: async (id_regla_agente: string, data: any) => {
    return Prioridad_Agente_Reglas.update(data, {
      where: { id_regla_agente }
    });
  },

  delete: async (id_regla_agente: string) => {
    return Prioridad_Agente_Reglas.destroy({
      where: { id_regla_agente }
    });
  }
};
