import { ICreateOrUpdatePresupuestoEmpleado } from "../../interface/Presupuestos/Presupuesto_Empleado.interface";
import Presupuesto_Empleado from "../../models/Presupuestos/Presupuesto_Empleado";
import { isUUID } from "../../utils/validaciones";
import { Op, WhereOptions, fn, col, literal } from "sequelize";
import { v4 as uuidv4 } from "uuid";

import { Transaction } from "sequelize";
import Presupuesto_Empresa from "../../models/Presupuestos/Presupuesto_Empresa";
import Empleado from "../../modules/RRHH/model/Empleado";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Asignacion_Empleado_Sucursal from "../../models/Presupuestos/Asignacion_Empleado_Sucursal";
import Venta from "../../models/Venta/Venta";
import CorteCaja from "../../models/Caja/Corte_Caja";
import Progreso_Reto from "../../modules/Gamificacion/model/Progreso_Reto";
import Reto from "../../modules/Gamificacion/model/Reto";

export const Presupuesto_EmpleadoRepository = {
  getAll: async () => {
    return await Presupuesto_Empleado.findAll(
      {
        include: [
          {
            model: Empleado,
            attributes: [
              "nombre_empleado",
              "ap_pat_empleado",
              "ap_mat_empleado"
            ],
          },
          {
            model: Empresa_Sucursal,
            attributes: ["nom_empre"]
          },
          {
            model: Presupuesto_Empresa,
            attributes: ["anio", "mes"]
          }
        ],
      }
    );
  },

  create: async (
    data: ICreateOrUpdatePresupuestoEmpleado,
    transaction: Transaction
  ) => {
    return await Presupuesto_Empleado.create(
      {
        id_presupuesto_empleado: uuidv4(),
        ...data,
      },
      { transaction }
    );
  },

  getEmpleadosNoAsignados: async (id_empre: string, id_presupuesto: string) => {
    const asignados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      attributes: ["id_empleado"],
    });

    const idsAsignados = asignados.map((a) => a.id_empleado);



    const disponibles = await Empleado.findAll({
      include: [
        {
          model: Asignacion_Empleado_Sucursal,
          as: "asignaciones",
          where: {
            id_empre,
            activo: true,
          },
          required: true,
        },
      ],
      where: idsAsignados.length
        ? { id_empleado: { [Op.notIn]: idsAsignados } }
        : {},
      attributes: [
        "id_empleado",
        "nombre_empleado",
        "ap_pat_empleado",
        "ap_mat_empleado",
        "id_sucursal_empleado"
      ],
      order: [["nombre_empleado", "ASC"]],
    });
    return disponibles;
  },

  findByPresupuesto: async (
    id_presupuesto: string,
    transaction?: Transaction) => {
    return await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      transaction,
    });
  },

  updateTotalesPresupuestoEmpresa: async (
    id_presupuesto: string,
    transaction?: Transaction) => {
    const empleados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      transaction,
    });

    const total_turnos = empleados.reduce(
      (acc, e) => acc + e.turnos_planeado,
      0
    );

    const presupuesto = await Presupuesto_Empresa.findByPk(id_presupuesto, {
      transaction,
    });

    if (!presupuesto) throw new Error("Presupuesto empresa no encontrado");

    const monto_por_turno =
      total_turnos > 0 ? presupuesto.monto_total / total_turnos : 0;

    presupuesto.turnos_planeados = total_turnos;
    presupuesto.monto_por_turno = monto_por_turno;

    await presupuesto.save({ transaction });

    for (const emp of empleados) {
      const nuevoMonto = emp.turnos_planeado * monto_por_turno;
      if (emp.monto_planeado !== nuevoMonto) {
        emp.monto_planeado = nuevoMonto;
        await emp.save({ transaction });
      }
    }

    return {
      total_turnos,
      monto_por_turno,
      empleados_actualizados: empleados.length,
    };
  },

  update: async (
    id_presupuesto_empleado: string,
    data: ICreateOrUpdatePresupuestoEmpleado) => {
    if (!isUUID(id_presupuesto_empleado)) return null;
    const presupuesto_empleado = await Presupuesto_Empleado.findByPk(
      id_presupuesto_empleado
    );

    if (!presupuesto_empleado) return null;
    await presupuesto_empleado.update(data);
    return presupuesto_empleado;
  },

  getByID: async (id_presupuesto_empleado: string) => {
    return await Presupuesto_Empleado.findByPk(id_presupuesto_empleado, {
      include: [
        {
          model: Empleado,
          attributes: [
            "nombre_empleado",
            "ap_pat_empleado",
            "ap_mat_empleado",
            // "departamento_empleado",
            // "puesto_empleado"
          ],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["nom_empre"],
        },
      ],
    });
  },

  getByPresupuesto: async (id_presupuesto: string) => {
    const empleados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      include: [
        {
          model: Empleado,
          attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["nom_empre"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const presupuesto = await Presupuesto_Empresa.findByPk(id_presupuesto, {
      attributes: [
        "id_presupuesto",
        "monto_total",
        "monto_por_turno",
        "turnos_planeados",
      ],
    });

    return { presupuesto, empleados };
  },

  sumarVentasEmpleadoPeriodo: async (id_empleado: string, anio: number, mes: number): Promise<number> => {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1); // primer día del mes siguiente
    const result = await Venta.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('total_venta')), literal('0')), 'total']],
      where: {
        id_empleado,
        status_venta: 'CONFIRMADA',
        createdAt: { [Op.gte]: inicio, [Op.lt]: fin },
      },
      raw: true,
    }) as any;
    return Number(result?.total ?? 0);
  },

  contarCortesEmpleadoPeriodo: async (id_empleado: string, anio: number, mes: number): Promise<number> => {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);
    return await CorteCaja.count({
      where: {
        id_usuario_apertura: id_empleado,
        status_corte: false, // cerrado
        fecha_apertura: { [Op.gte]: inicio, [Op.lt]: fin },
      },
    });
  },

  /**
   * Suma el monto_en_espera de retos con excluye_monto_hasta_completar=true
   * que el empleado aún no ha completado en el periodo indicado.
   * Este monto debe restarse del total de ventas para calcular el monto_real del presupuesto.
   */
  getMontoEnEsperaRetos: async (id_empleado: string, id_empresa: string, anio: number, mes: number): Promise<number> => {
    const periodo_ref_mensual = `${anio}-${String(mes).padStart(2, '0')}`;
    const result = await Progreso_Reto.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('progreso_reto.monto_en_espera')), literal('0')), 'total']],
      where: {
        id_empleado,
        completado: false,
      },
      include: [{
        model: Reto,
        attributes: [],
        where: {
          id_empresa,
          excluye_monto_hasta_completar: true,
        },
        required: true,
      }],
      // Solo periodos dentro del mes
      // periodo_ref puede ser '2026-07' (mensual) o '2026-07-Q1' (quincenal)
      raw: true,
    }) as any;

    // Filtramos en memoria los registros del mes para no necesitar LIKE en ORM
    // La consulta anterior trae todo; la siguiente limita al mes correcto
    const rows = await Progreso_Reto.findAll({
      attributes: ['monto_en_espera', 'periodo_ref'],
      where: {
        id_empleado,
        completado: false,
      },
      include: [{
        model: Reto,
        attributes: [],
        where: { id_empresa, excluye_monto_hasta_completar: true },
        required: true,
      }],
      raw: true,
    }) as any[];

    const total = rows
      .filter((r: any) => (r.periodo_ref as string).startsWith(periodo_ref_mensual))
      .reduce((acc: number, r: any) => acc + Number(r.monto_en_espera ?? 0), 0);

    return total;
  },

  getHistorialByEmpleado: async (id_empleado: string) => {
    return await Presupuesto_Empleado.findAll({
      where: { id_empleado },
      include: [
        {
          model: Presupuesto_Empresa,
          attributes: ['id_presupuesto', 'anio', 'mes', 'monto_total', 'monto_por_turno', 'estado_presupuesto'],
          required: true,
        },
        {
          model: Empresa_Sucursal,
          attributes: ['nom_empre'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  },

  getPerfilByEmpleadoEmpresa: async (id_empleado: string, id_empre: string) => {
    return await Presupuesto_Empleado.findOne({
      where: { id_empleado, id_empre },
      include: [
        {
          model: Presupuesto_Empresa,
          where: { estado_presupuesto: ['PLANIFICADO', 'EJECUCION'] },
          attributes: ['id_presupuesto', 'anio', 'mes', 'monto_total', 'monto_por_turno', 'estado_presupuesto'],
          required: true,
        },
      ],
      order: [[{ model: Presupuesto_Empresa, as: 'presupuesto' }, 'anio', 'DESC'],
              [{ model: Presupuesto_Empresa, as: 'presupuesto' }, 'mes', 'DESC']],
    });
  },

  delete: async (id_presupuesto_empleado: string, transaction?: any) => {
    const empleado = await Presupuesto_Empleado.findByPk(
      id_presupuesto_empleado,
      { transaction }
    );
    if (!empleado) return null;

    await empleado.destroy({ transaction });
    return empleado;
  },
};
