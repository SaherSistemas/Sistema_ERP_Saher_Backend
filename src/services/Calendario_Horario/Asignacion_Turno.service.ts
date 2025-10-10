import { ICreateOrUpdateAsignacion_Turno } from "../../interface/Calendario_horario/Asignacion_Turno.interface";
import { Asignacion_TurnoRepository } from "../../repository/Calendario_Horario/Asignacion_Turno.repository";
import { Transaction } from "sequelize";
import { isUUID } from "../../utils/validaciones";
import { EmpleadoRepository } from "../../repository/Usuarios/Empleado.repository";

export const Asignacion_TurnoService = {
  TurnosAsignadosEmpleado: async (
    id_empleado: string,
    fecha_inicio: string,
    fecha_fin: string
  ) => {
      if (!id_empleado || !fecha_inicio || !fecha_fin) {
        throw new Error("Faltan parámetros obligatorios");
      }
      if (fecha_inicio > fecha_fin) {
        throw new Error(
          "La fecha de inicio no puede ser mayor que la fecha fin"
        );
      }
      const emp = await EmpleadoRepository.getByIdFlexible(id_empleado);
      if (!emp) throw new Error("Empleado no encontrado");
      if (!emp.estatus_empleado === true) throw new Error("Empleado inactivo");
   
    return await Asignacion_TurnoRepository.TurnosAsignadosEmpleado(
      id_empleado,
      fecha_inicio,
      fecha_fin,
      {
        estadosAsignacion: ['asignado', 'completado'],
        estadosTurno: ['asignado']
      }
    );
  },

  getByTurno: async (id_turno: string) => {
    try {
      const asignacion = await Asignacion_TurnoRepository.getByTurno(id_turno);
      if (!asignacion) {
        throw new Error("No hay asignación para este turno");
        return null;
      }
      return asignacion;
    } catch (error) {
      throw new Error("Error al obtener la asignación");
    }
  },

  getAll: async () => {
    return await Asignacion_TurnoRepository.getAll();
  },

  getById: async (id_asignacion: string) => {
    return await Asignacion_TurnoRepository.getById(id_asignacion);
  },

  getByEmpleado: async (id_empleado: string) => {
    return await Asignacion_TurnoRepository.getByEmpleado(id_empleado);
  },

  create: async (
    data: ICreateOrUpdateAsignacion_Turno,
    transaction?: Transaction
  ) => {
    return await Asignacion_TurnoRepository.create(data, transaction);
  },
  update: async (
    id_asignacion: string,
    data: ICreateOrUpdateAsignacion_Turno,
    transaction?: Transaction
  ) => {
    return await Asignacion_TurnoRepository.update(
      id_asignacion,
      data,
      transaction
    );
  },

  delete: async (id_asignacion: string, transaction?: Transaction) => {
    return await Asignacion_TurnoRepository.delete(id_asignacion, transaction);
  },
};
