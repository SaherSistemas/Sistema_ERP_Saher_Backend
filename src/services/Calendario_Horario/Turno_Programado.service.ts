import { Transaction } from "sequelize";
import { ICreateOrUpdateAsignacion_Turno } from "../../interface/Calendario_horario/Asignacion_Turno.interface";
import { ICreateOrUpdateTurno_Programado } from "../../interface/Calendario_horario/Turno_Programado.interface";
import { Turno_ProgramadoRepository } from "../../repository/Calendario_Horario/Turno_Programado.repository";
import { isUUID } from "../../utils/validaciones";
import { Periodo_CalendarioRepository } from "../../repository/Calendario_Horario/Periodo_Calendario.reposiroty";

export const Turno_ProgramadoService = {
  getTurnosPorPeriodo: async (id_periodo: string) => {
    const periodo = await Periodo_CalendarioRepository.getById(id_periodo);
    if (!periodo) {
      throw new Error("Periodo no encontrado");
    }
    const turnos = await Turno_ProgramadoRepository.getTurnosPorPeriodo(id_periodo);

    const totales = {
      turnos: turnos.length,
      vacantes: turnos.filter(t => t.estado === "vacante").length,
      asignados: turnos.filter(t => t.estado === "asignado").length,
      cancelados: turnos.filter(t => t.estado === "cancelado").length,
    };
    return { periodo, turnos, totales };
  },


  getAll: async () => {
    return await Turno_ProgramadoRepository.getAll();
  },

  getById: async (id_turno: string) => {
    return await Turno_ProgramadoRepository.getById(id_turno);
  },

  create: async (data: ICreateOrUpdateTurno_Programado) => {
    return await Turno_ProgramadoRepository.create(data);
  },

  update: async (id_turno: string, data: ICreateOrUpdateTurno_Programado) => {
    return await Turno_ProgramadoRepository.update(id_turno, data);
  },

  delete: async (id_turno: string) => {
    return await Turno_ProgramadoRepository.delete(id_turno);
  },
};
