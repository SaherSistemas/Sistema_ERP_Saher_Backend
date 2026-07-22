import { v4 as uuidv4 } from "uuid";
import { col, fn, literal, Transaction } from "sequelize";
import { Op } from "sequelize";
import Asignacion_Empleado_Sucursal from "../../models/Presupuestos/Asignacion_Empleado_Sucursal";
import { ICreateOrUpdateAsignacion_Empleado_Sucursal } from "../../interface/Presupuestos/Asignacion_Empleado_Sucursal.interface";
import { isUUID } from "../../utils/validaciones";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Empleado from "../../modules/RRHH/model/Empleado";

export const Asignacion_Empleado_SucursalRepository = {
  getAll: async () => {
    return await Asignacion_Empleado_Sucursal.findAll({
      include: [
        {
          model: Empleado,
          attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["id_empre", "nom_empre"],
        },
      ],

    });
  },
  getEmpleadosSinAsignacionEmpresa: async (id_empre: string) => {
    // 1. Buscar empleados que ya están asignados activamente a esa empresa
    const asignaciones = await Asignacion_Empleado_Sucursal.findAll({
      where: {
        id_empre,
        activo: true,
      },
      attributes: ["id_empleado"],
    });

    const idsAsignados = asignaciones.map((a) => a.id_empleado);

    // 2. Buscar empleados que no estén en esa lista
    const empleadosDisponibles = await Empleado.findAll({
      where: idsAsignados.length
        ? { id_empleado: { [Op.notIn]: idsAsignados } }
        : {},
      attributes: [
        "id_empleado",
        "nombre_empleado",
        "ap_pat_empleado",
        "ap_mat_empleado",
      ],
      order: [["nombre_empleado", "ASC"]],
    });

    return empleadosDisponibles;
  },
  getAllResumenPorEmpleado: async () => {
    return await Asignacion_Empleado_Sucursal.findAll({
      attributes: [
        "id_empleado",
        [fn("COUNT", col("Asignacion_Empleado_Sucursal.id_asignacion")), "total_asignaciones"],
      ],
      include: [
        {
          model: Empleado,
          attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"],
        },
      ],
      group: ["Asignacion_Empleado_Sucursal.id_empleado", "empleado.id_empleado"],
      order: [[fn("COUNT", col("Asignacion_Empleado_Sucursal.id_asignacion")), "DESC"]],
      raw: false,
    });
  },


  getAllEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado },
      include: [
        {
          model: Empleado,
          attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["id_empre", "nom_empre"],
        },
      ],
      order: [["fecha_inicio", "ASC"]],
    });
  },

  getByID: async (id_asignacion: string) => {
    if (!isUUID(id_asignacion)) return null;
    return await Asignacion_Empleado_Sucursal.findByPk(id_asignacion);
  },

  getAsignacionesEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado },
    });
  },

  getAsignacionesSucursal: async (id_empre: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empre },
    });
  },

  getActivasPorEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado, activo: true },
    });
  },

  create: async (
    data: ICreateOrUpdateAsignacion_Empleado_Sucursal,
    transaction: Transaction
  ) => {
    const { id_empleado, tipo, fecha_inicio, turno } = data;

    if (tipo === "FIJO") {
      const fijaActiva = await Asignacion_Empleado_Sucursal.findOne({
        where: { id_empleado, tipo: "FIJO", activo: true },
        transaction,
      });
      if (fijaActiva) {
        throw new Error("El empleado ya tiene una asignación FIJA activa.");
      }
    }

    if (tipo !== "FIJO") {
      const conflicto = await Asignacion_Empleado_Sucursal.findOne({
        where: {
          id_empleado,
          tipo: { [Op.in]: ["COBERTURA", "TEMPORAL"] },
          fecha_inicio,
          turno,
          activo: true,
        },
        transaction,
      });
      if (conflicto) {
        throw new Error(
          "Ya existe una asignación para ese empleado, turno y fecha."
        );
      }
    }

    const nueva = await Asignacion_Empleado_Sucursal.create(
      {
        id_asignacion: uuidv4(),
        ...data,
      },
      { transaction }
    );

    return nueva;
  },

  update: async (
    id_asignacion: string,
    data: ICreateOrUpdateAsignacion_Empleado_Sucursal,
    transaction: Transaction
  ) => {
    if (!isUUID(id_asignacion)) return null;

    const asignacion = await Asignacion_Empleado_Sucursal.findByPk(
      id_asignacion,
      { transaction }
    );
    if (!asignacion) return null;

    if (data.tipo === "FIJO") {
      const otraFija = await Asignacion_Empleado_Sucursal.findOne({
        where: {
          id_empleado: asignacion.id_empleado,
          tipo: "FIJO",
          activo: true,
          id_asignacion: { [Op.ne]: id_asignacion },
        },
        transaction,
      });
      if (otraFija) {
        throw new Error(
          "El empleado ya tiene una asignación FIJA activa. Debe desactivarla antes de crear otra."
        );
      }
    }

    await asignacion.update(data, { transaction });
    return asignacion;
  },


  delete: async (id_asignacion: string, transaction?: Transaction) => {
    if (!isUUID(id_asignacion)) return null;
    const asignacion = await Asignacion_Empleado_Sucursal.findByPk(
      id_asignacion,
      { transaction }
    );
    if (!asignacion) return null;

    await asignacion.update({ activo: false }, { transaction });
    return asignacion;
  },

  /**
   * Retorna empleados con asignación activa en la sucursal para una fecha dada.
   * Incluye tipo FIJO (sin fecha_fin obligatoria) y TEMPORAL/COBERTURA cuya ventana
   * abarca la fecha solicitada.
   */
  getEmpleadosActivosHoy: async (id_empre: string, fecha: Date) => {
    // Usamos comparación DATE en PostgreSQL para evitar desfase de zona horaria.
    // fecha puede llegar como "2026-07-21" o como Date; normalizamos a YYYY-MM-DD.
    const fechaStr = fecha instanceof Date
      ? fecha.toISOString().slice(0, 10)
      : String(fecha).slice(0, 10);

    return Asignacion_Empleado_Sucursal.findAll({
      where: {
        id_empre,
        activo: true,
        [Op.or]: [
          // FIJO: fecha_inicio::date <= hoy
          {
            tipo: 'FIJO',
            [Op.and]: [literal(`"fecha_inicio"::date <= '${fechaStr}'::date`)],
          },
          // TEMPORAL / COBERTURA: fecha_inicio <= hoy <= fecha_fin (comparación DATE)
          {
            tipo: { [Op.in]: ['TEMPORAL', 'COBERTURA'] },
            [Op.and]: [
              literal(`"fecha_inicio"::date <= '${fechaStr}'::date`),
              literal(`"fecha_fin"::date >= '${fechaStr}'::date`),
            ],
          },
        ],
      },
      include: [
        {
          model: Empleado,
          attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'],
        },
      ],
      order: [
        [{ model: Empleado, as: 'empleado' }, 'nombre_empleado', 'ASC'],
      ],
    });
  },
};
