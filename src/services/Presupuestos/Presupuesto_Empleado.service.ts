import { ICreateOrUpdatePresupuestoEmpleado } from "../../interface/Presupuestos/Presupuesto_Empleado.interface";
import Presupuesto_Empleado from "../../models/Presupuestos/Presupuesto_Empleado";
import Presupuesto_Empresa from "../../models/Presupuestos/Presupuesto_Empresa";
import { Presupuesto_EmpleadoRepository } from "../../repository/Presupuestos/Presupuesto_Empleado.repository";
import { Transaction } from "sequelize";

export const Presupuesto_EmpleadoService = {
  getAll: async () => {
    return await Presupuesto_EmpleadoRepository.getAll();
  },
  
  getEmpleadosNoAsignados: async (id_empre: string, id_presupuesto: string) => {
      if (!id_empre || !id_presupuesto) {
        throw new Error("Faltan parámetros obligatorios: id_empre o id_presupuesto.");
      }

      const empleados = await Presupuesto_EmpleadoRepository.getEmpleadosNoAsignados(
        id_empre,
        id_presupuesto
      );

      return empleados;
    },
 

  // getPresupuestoPorEmpleado: async (id_empleado: string, id_empre: string, id_presupuesto: string) => {
  //   return await Presupuesto_EmpleadoRepository.getPresupuestoPorEmpleado(
  //     id_empleado,
  //     id_empre,
  //     id_presupuesto
  //   );
  // },

  create: async (data: ICreateOrUpdatePresupuestoEmpleado) => {
    const t = await Presupuesto_Empleado.sequelize!.transaction();
    try {
      const existente = await Presupuesto_Empleado.findOne({
      where: {
        id_presupuesto: String(data.id_presupuesto), // asegurar formato correcto
        id_empre: data.id_empre,
        id_empleado: data.id_empleado,
      },
      transaction: t,
    });
    if (existente) {
          throw new Error("El empleado ya tiene un presupuesto asignado en este periodo.");
        }

      const empleado = await Presupuesto_EmpleadoRepository.create(data, t);

      const recalculo =
        await Presupuesto_EmpleadoRepository.updateTotalesPresupuestoEmpresa(
          data.id_presupuesto,
          t
        );

      const presupuesto = await Presupuesto_Empresa.findByPk(
        data.id_presupuesto,
        { transaction: t }
      );

      if (presupuesto && presupuesto.monto_por_turno) {
        empleado.monto_planeado =
          Number(presupuesto.monto_por_turno) *
          Number(empleado.turnos_planeado);
        await empleado.save({ transaction: t });
      }

      await t.commit();

      return { empleado, recalculo };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  update: async (
    id_presupuesto_empleado: string,
    data: Partial<ICreateOrUpdatePresupuestoEmpleado>) => {
    const t = await Presupuesto_Empleado.sequelize!.transaction();

    try {
      const empleado = await Presupuesto_Empleado.findByPk(
        id_presupuesto_empleado,
        { transaction: t }
      );
      if (!empleado) throw new Error("Presupuesto de empleado no encontrado");

      await empleado.update(data, { transaction: t });

      const recalculo =
        await Presupuesto_EmpleadoRepository.updateTotalesPresupuestoEmpresa(
          empleado.id_presupuesto,
          t
        );

      const presupuesto = await Presupuesto_Empresa.findByPk(
        empleado.id_presupuesto,
        { transaction: t }
      );
      if (presupuesto?.monto_por_turno) {
        empleado.monto_planeado =
          empleado.turnos_planeado * presupuesto.monto_por_turno;
        await empleado.save({ transaction: t });
      }

      await t.commit();
      return { empleado, recalculo };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  getByID: async (id: string) => {
    const empleado = await Presupuesto_EmpleadoRepository.getByID(id);
    if (!empleado) throw new Error("Presupuesto de empleado no encontrado");

    return {
      id_presupuesto_empleado: empleado.id_presupuesto_empleado,
      turnos_planeado: empleado.turnos_planeado,
      monto_planeado: empleado.monto_planeado,
      nombre_empleado: `${empleado.empleado?.nombre_empleado ?? ""} ${
        empleado.empleado?.ap_pat_empleado ?? ""
      } ${empleado.empleado?.ap_mat_empleado ?? ""}`.trim(),
      empresa_sucursal: empleado.empresa_sucursal?.nom_empre,
    };
  },

  getByPresupuesto: async (id_presupuesto: string) => {
    const data = await Presupuesto_EmpleadoRepository.getByPresupuesto(
      id_presupuesto
    );
    if (!data.presupuesto) throw new Error("Presupuesto no encontrado");

    const empleadosFormateados = data.empleados.map((e: any) => ({
      id_presupuesto_empleado: e.id_presupuesto_empleado,
      id_empleado: e.id_empleado,
      nombre_empleado: `${e.empleado?.nombre_empleado ?? ""} ${
        e.empleado?.ap_pat_empleado ?? ""
      } ${e.empleado?.ap_mat_empleado ?? ""}`.trim(),
      sucursal: e.empresa_sucursal?.nom_empre,
      turnos_planeado: e.turnos_planeado,
      monto_planeado: e.monto_planeado,
    }));

    return {
      presupuesto: data.presupuesto,
      empleados: empleadosFormateados,
    };
  },

  getHistorialByEmpleado: async (id_empleado: string) => {
    const rows = await Presupuesto_EmpleadoRepository.getHistorialByEmpleado(id_empleado);
    return rows.map((e: any) => {
      const pres = e.presupuesto;
      const monto_planeado = Number(e.monto_planeado ?? 0);
      const monto_real = Number(e.monto_real ?? 0);
      const pct = monto_planeado > 0 ? Math.min(100, Math.round((monto_real / monto_planeado) * 100)) : 0;
      return {
        id_presupuesto_empleado: e.id_presupuesto_empleado,
        id_presupuesto: e.id_presupuesto,
        sucursal: e.empresa_sucursal?.nom_empre ?? null,
        anio: pres?.anio,
        mes: pres?.mes,
        estado_presupuesto: pres?.estado_presupuesto,
        monto_planeado,
        monto_real,
        porcentaje: pct,
        turnos_planeado: e.turnos_planeado ?? 0,
        turnos_reales: e.turnos_reales ?? 0,
      };
    });
  },

  getPerfilByEmpleadoEmpresa: async (id_empleado: string, id_empre: string) => {
    const row = await Presupuesto_EmpleadoRepository.getPerfilByEmpleadoEmpresa(id_empleado, id_empre);
    if (!row) return null;
    const pres = row.presupuesto as any;
    const monto_planeado = Number(row.monto_planeado);
    const [ventasTotal, montoEnEspera, turnos_reales] = pres ? await Promise.all([
      Presupuesto_EmpleadoRepository.sumarVentasEmpleadoPeriodo(id_empleado, pres.anio, pres.mes),
      Presupuesto_EmpleadoRepository.getMontoEnEsperaRetos(id_empleado, id_empre, pres.anio, pres.mes),
      Presupuesto_EmpleadoRepository.contarCortesEmpleadoPeriodo(id_empleado, pres.anio, pres.mes),
    ]) : [0, 0, 0];
    const monto_real = pres ? Math.max(0, (ventasTotal as number) - (montoEnEspera as number)) : 0;
    return {
      id_presupuesto_empleado: row.id_presupuesto_empleado,
      turnos_planeado: row.turnos_planeado,
      turnos_reales,
      monto_planeado,
      monto_real,
      presupuesto: pres ? {
        anio: pres.anio,
        mes: pres.mes,
        monto_total: Number(pres.monto_total),
        estado_presupuesto: pres.estado_presupuesto,
      } : null,
    };
  },

  delete: async (id_presupuesto_empleado: string) => {
    const t = await Presupuesto_Empleado.sequelize!.transaction();

    try {
      const empleado = await Presupuesto_EmpleadoRepository.delete(id_presupuesto_empleado, t);
      if (!empleado) throw new Error("Presupuesto de empleado no encontrado");

      const recalculo = await Presupuesto_EmpleadoRepository.updateTotalesPresupuestoEmpresa(
        empleado.id_presupuesto,
        t
      );

      await t.commit();

      return { eliminado: empleado, recalculo };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },


}; 
// ke
