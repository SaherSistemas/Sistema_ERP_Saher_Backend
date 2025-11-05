import { Transaction } from "sequelize";
import { Asignacion_Empleado_SucursalRepository } from "../../repository/Presupuestos/Asignacion_Empleado_Sucursal.repository";
import { Presupuesto_EmpresaRepository } from "../../repository/Presupuestos/Presupuesto_Empresa.repository";
import Asignacion_Empleado_Sucursal from "../../models/Presupuestos/Asignacion_Empleado_Sucursal";
import { Presupuesto_EmpleadoRepository } from "../../repository/Presupuestos/Presupuesto_Empleado.repository";
import { ICreateOrUpdateAsignacion_Empleado_Sucursal } from "../../interface/Presupuestos/Asignacion_Empleado_Sucursal.interface";
import { isUUID } from "../../utils/validaciones";

export const Asignacion_Empleado_SucursalService = {

  getAll: async () => {
    return await Asignacion_Empleado_SucursalRepository.getAll();
  },

  getResumenPorEmpleado: async () => {
    const data = await Asignacion_Empleado_SucursalRepository.getAllResumenPorEmpleado();
    return {
      total_empleados: data.length,
      detalle: data,
    };
  },

  getEmpleadosSinAsignacionEmpresa: async (id_empre: string) => {
    if (!id_empre) throw new Error("El ID de empresa es obligatorio.");
    const empleados = await Asignacion_Empleado_SucursalRepository.getEmpleadosSinAsignacionEmpresa(id_empre);

    return {
      mensaje: "Empleados sin asignación en la empresa obtenidos correctamente.",
      total: empleados.length,
      empleados,
    };
  },



  getAllByEmpleado: async (id_empleado: string) => {
    if (!isUUID(id_empleado)) {
      throw new Error("El ID del empleado no es válido.");
    }

    const asignaciones = await Asignacion_Empleado_SucursalRepository.getAllEmpleado(id_empleado);

    if (!asignaciones || asignaciones.length === 0) {
      return {
        mensaje: "El empleado no tiene asignaciones registradas.",
        asignaciones: [],
      };
    }

    return {
      mensaje: "Asignaciones del empleado obtenidas correctamente.",
      total: asignaciones.length,
      asignaciones,
    };
  },

  create: async (data: ICreateOrUpdateAsignacion_Empleado_Sucursal) => {
    const t = await Asignacion_Empleado_Sucursal.sequelize!.transaction();
    try {
      const { id_empleado, tipo, fecha_inicio, fecha_fin, turno } = data;

      const inicio = new Date(fecha_inicio);
      const fin = fecha_fin ? new Date(fecha_fin) : null;
      if (fin && fin < inicio) throw new Error("La fecha de fin no puede ser anterior al inicio.");

      if (tipo === "FIJO") {
        const fijaActiva = await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(id_empleado);
        const yaTieneFija = fijaActiva.some((a) => a.tipo === "FIJO");
        if (yaTieneFija)
          throw new Error("El empleado ya tiene una asignación FIJA activa.");
      }

      if (tipo !== "FIJO") {
        const asignacionesActivas =
          await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(id_empleado);

        const existeConflicto = asignacionesActivas.some((a: any) => {
          if (!a.fecha_inicio) return false;

          const aInicio = new Date(a.fecha_inicio);
          const aFin = a.fecha_fin ? new Date(a.fecha_fin) : null;

          const solapanFechas =
            (!aFin || !fin || fin >= aInicio) && (!fin || !aFin || aFin >= inicio);

          return (
            a.turno === turno &&
            a.tipo !== "FIJO" &&
            a.activo &&
            solapanFechas
          );
        });

        if (existeConflicto)
          throw new Error(
            "El empleado ya tiene una asignación activa para esa fecha y turno."
          );
      }

      const asignacion = await Asignacion_Empleado_SucursalRepository.create(
        { ...data },
        t
      );

      await t.commit();

      return {
        mensaje: "Asignación creada correctamente",
        asignacion,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  getByID: async (id: string) => {
    const asignacion = await Asignacion_Empleado_SucursalRepository.getByID(id);
    if (!asignacion) throw new Error("Asignación no encontrada.");

    return asignacion;
  },


  update: async (
    id_asignacion: string,
    data: ICreateOrUpdateAsignacion_Empleado_Sucursal
  ) => {
    if (!isUUID(id_asignacion)) {
      throw new Error("El identificador de asignación no es válido.");
    }

    const t = await Asignacion_Empleado_Sucursal.sequelize!.transaction();
    try {
      const asignacionExistente =
        await Asignacion_Empleado_SucursalRepository.getByID(id_asignacion);
      if (!asignacionExistente) throw new Error("Asignación no encontrada.");

      if (data.fecha_inicio && data.fecha_fin) {
        const inicio = new Date(data.fecha_inicio);
        const fin = new Date(data.fecha_fin);
        if (fin < inicio)
          throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
      }

      if (data.id_empleado || data.fecha_inicio || data.fecha_fin) {
        const asignacionesActivas =
          await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(
            data.id_empleado ?? asignacionExistente.id_empleado
          );

        const inicio = new Date(data.fecha_inicio ?? asignacionExistente.fecha_inicio);
        const fin = data.fecha_fin
          ? new Date(data.fecha_fin)
          : asignacionExistente.fecha_fin
            ? new Date(asignacionExistente.fecha_fin)
            : null;

        const existeTraslape = asignacionesActivas.some((a: any) => {
          if (a.id_asignacion === id_asignacion) return false;
          const aInicio = new Date(a.fecha_inicio);
          const aFin = a.fecha_fin ? new Date(a.fecha_fin) : null;

          const solapanFechas =
            (!aFin || !fin || fin >= aInicio) && (!fin || !aFin || aFin >= inicio);

          return a.activo && solapanFechas && a.turno === (data.turno ?? asignacionExistente.turno);
        });

        if (existeTraslape)
          throw new Error(
            "El empleado ya tiene otra asignación activa en ese periodo y turno."
          );
      }

      if (data.tipo === "FIJO") {
        const activas = await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(
          data.id_empleado ?? asignacionExistente.id_empleado
        );
        const otraFija = activas.find(
          (a) => a.tipo === "FIJO" && a.id_asignacion !== id_asignacion
        );
        if (otraFija)
          throw new Error(
            "El empleado ya tiene una asignación FIJA activa. Debe cerrarla antes de crear otra."
          );
      }

      const asignacionActualizada =
        await Asignacion_Empleado_SucursalRepository.update(
          id_asignacion,
          data,
          t
        );

      await t.commit();
      return {
        mensaje: "Asignación actualizada correctamente",
        data: asignacionActualizada,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
};
