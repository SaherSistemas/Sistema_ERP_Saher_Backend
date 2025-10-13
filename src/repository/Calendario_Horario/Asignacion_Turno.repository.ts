import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import { Op } from "sequelize";
import { Transaction } from "sequelize";
import Asignacion_Turno from "../../models/Calendario_Horario/Asignacion_Turno";

import { ICreateOrUpdateAsignacion_Turno } from "../../interface/Calendario_horario/Asignacion_Turno.interface";
import Turno_Programado from "../../models/Calendario_Horario/Turno_Programado";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Empleado from "../../models/Usuarios/Empleado/Empleado";

export const Asignacion_TurnoRepository = {

  TurnosAsignadosEmpleado: async (
    id_empleado: string,
    fecha_inicio: string,
    fecha_fin: string,
    opts?: { estadosAsignacion?: string[]; estadosTurno?: string[] }
  ) => {
    const where: any = {
      id_empleado,
    };

    // puedes usar opts si llegan
    if (opts?.estadosAsignacion) {
      where.estado_asignacion = opts.estadosAsignacion;
    }

    // ejemplo de include con filtro por fecha del turno
    return await Asignacion_Turno.findAll({
      where,
      include: [
        {
          model: Turno_Programado,
          where: {
            fecha: { [Op.between]: [fecha_inicio, fecha_fin] },
            ...(opts?.estadosTurno && { estado: opts.estadosTurno }),
          },
          include: [
            {
              model: Empresa_Sucursal,
              attributes: ["id_empre", "nom_empre"],
            },
          ],
        },
        {
          model: Empleado,
          attributes: ["id_empleado", "nombre_empleado", "ap_pat_empleado"],
        },
      ],
    });
  },

  getByTurno: async (id_turno: string) => {
    return await Asignacion_Turno.findOne({
      where: { id_turno },
      include: [
        {
          model: Empleado,
          attributes: ["id_empleado", "nombre_empleado", "ap_pat_empleado"],
        },
      ],
    });
  },

  getAll: async () => {
    return await Asignacion_Turno.findAll();
  },

  getById: async (id_asignacion: string) => {
    if (!isUUID(id_asignacion)) throw new Error("ID de asignación inválido");
    return await Asignacion_Turno.findByPk(id_asignacion);
  },

  getByEmpleado: async (id_empleado: string) => {
    if (!isUUID(id_empleado)) throw new Error("ID de empleado inválido");
    return await Asignacion_Turno.findAll({ where: { id_empleado } });
  },

  create: async (
    data: ICreateOrUpdateAsignacion_Turno,
    transaction?: Transaction
  ) => {
    const nuevaAsignacion = await Asignacion_Turno.create(
      {
        id_asignacion: uuidv4(),
        ...data,
      },
      { transaction }
    );
    return nuevaAsignacion;
  },

  update: async (
    id_asignacion: string,
    data: ICreateOrUpdateAsignacion_Turno,
    transaction?: Transaction
  ) => {
    if (!isUUID(id_asignacion)) throw new Error("ID de asignación inválido");
    const asignacion = await Asignacion_Turno.findByPk(id_asignacion);
    if (!asignacion) throw new Error("Asignación no encontrada");
    await asignacion.update(data, { transaction });
    return asignacion;
  },

  delete: async (id_asignacion: string, transaction?: Transaction) => {
    if (!isUUID(id_asignacion)) throw new Error("ID de asignación inválido");
    const asignacion = await Asignacion_Turno.findByPk(id_asignacion);
    if (!asignacion) throw new Error("Asignación no encontrada");
    await asignacion.destroy({ transaction });
    return asignacion;
  },
};
