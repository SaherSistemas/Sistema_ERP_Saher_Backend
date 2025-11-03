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

  create: async (data: any) => {
    const t = await Asignacion_Empleado_Sucursal.sequelize!.transaction();
    try {
      const asignacionesActivas =
        await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(
          data.id_empleado
        );

      const existeTraslape = asignacionesActivas.some((a: any) => {
        const inicio = new Date(data.fecha_inicio);
        const fin = data.fecha_fin ? new Date(data.fecha_fin) : null;
        const aInicio = new Date(a.fecha_inicio);
        const aFin = a.fecha_fin ? new Date(a.fecha_fin) : null;

        return (
          (!aFin || !fin || fin >= aInicio) && (!fin || !aFin || aFin >= inicio)
        );
      });

      if (existeTraslape) {
        throw new Error(
          "El empleado ya tiene una asignación activa en ese periodo."
        );
      }

      const asignacion = await Asignacion_Empleado_SucursalRepository.create(
        { ...data },
        t
      );

      const presupuestoActivo =
        await Presupuesto_EmpresaRepository.getAllPresupuestoVigenteEmpresa(
          data.id_empre
        );

      let presupuestoEmpleado = null;
      if (presupuestoActivo) {
        presupuestoEmpleado = await Presupuesto_EmpleadoRepository.create(
          {
            id_presupuesto: presupuestoActivo.id_presupuesto,
            id_empre: data.id_empre,
            id_empleado: data.id_empleado,
            turnos_planeado: 0,
            monto_planeado: 0,
          },
          t
        );

        await Presupuesto_EmpleadoRepository.updateTotalesPresupuestoEmpresa(
          presupuestoActivo.id_presupuesto,
          t
        );
      }

      await t.commit();

      return {
        mensaje: "Asignación creada correctamente",
        asignacion,
        presupuesto_empleado_creado: presupuestoEmpleado,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  getByID: async (id: string) => {
    const empleado = await Asignacion_Empleado_SucursalRepository.getByID(id);
    if (!empleado) throw new Error("Asignación de empleado no encontrada");

    return {
      id_asignacion: empleado.id_asignacion,
      fecha_inicio: empleado.fecha_inicio,
      fecha_fin: empleado.fecha_fin,
      tipo: empleado.tipo,
      id_empleado: empleado.id_empleado,
      id_empre: empleado.id_empre,
    };
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
      const asignacion = await Asignacion_Empleado_SucursalRepository.getByID(
        id_asignacion
      );
      if (!asignacion) {
        throw new Error("Asignación no encontrada.");
      }

      if (data.fecha_inicio && data.fecha_fin) {
        const inicio = new Date(data.fecha_inicio);
        const fin = new Date(data.fecha_fin);
        if (fin < inicio) {
          throw new Error(
            "La fecha de fin no puede ser anterior a la de inicio."
          );
        }
      }

      if (data.id_empleado || data.fecha_inicio || data.fecha_fin) {
        const asignacionesActivas =
          await Asignacion_Empleado_SucursalRepository.getActivasPorEmpleado(
            data.id_empleado ?? asignacion.id_empleado
          );

        const existeTraslape = asignacionesActivas.some((a: any) => {
          if (a.id_asignacion === id_asignacion) return false;
          const inicio = new Date(data.fecha_inicio ?? asignacion.fecha_inicio);
          const fin = data.fecha_fin
            ? new Date(data.fecha_fin)
            : asignacion.fecha_fin
            ? new Date(asignacion.fecha_fin)
            : null;
          const aInicio = new Date(a.fecha_inicio);
          const aFin = a.fecha_fin ? new Date(a.fecha_fin) : null;

          return (
            (!aFin || !fin || fin >= aInicio) &&
            (!fin || !aFin || aFin >= inicio)
          );
        });

        if (existeTraslape) {
          throw new Error(
            "El empleado tiene otra asignación activa en ese periodo."
          );
        }
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
