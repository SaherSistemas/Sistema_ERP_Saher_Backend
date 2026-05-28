import { v4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Presupuesto_Agente from '../model/Presupuesto_Agente';
import Presupuesto_Agente_Mov from '../model/Presupuesto_Agente_Mov';
import Presupuesto_Agente_Hist from '../model/Presupuesto_Agente_Hist';
import Agente_de_Venta from '../model/Agente_De_Venta';
import Empleado from '../../../RRHH/model/Empleado';
import {
  IPresupuesto_Agente_Historico,
  IPresupuesto_Agente_Movimiento,
  IPresupuesto_AgenteCreate
} from '../interface/Presupuesto_Agente.interface';

export const PresupuestoAgenteRepository = {

  // ================================
  // Obtener todos los presupuestos
  // ================================
  getAll: async () => {
    return await Presupuesto_Agente.findAll();
  },

  // ================================
  // Crear presupuesto mensual
  // ================================
  create: async (data: IPresupuesto_AgenteCreate) => {
    return await Presupuesto_Agente.create({
      id_presupuesto_agente: v4(),
      ...data
    });
  },

  // ================================
  // Obtener presupuesto activo de un agente
  // ================================
  getActivo: async (id_agente: string) => {
    return await Presupuesto_Agente.findOne({
      where: { id_agente, estatus: 'ABIERTO' }
    });
  },

  // ================================
  // Cerrar presupuesto
  // ================================
  cerrarPresupuesto: async (id_presupuesto_agente: string, data: Presupuesto_Agente) => {
    return await Presupuesto_Agente.update(data, {
      where: { id_presupuesto_agente }
    });
  },

  // ================================
  // Insertar movimiento (ajuste manual)
  // ================================
  registrarMovimiento: async (data: IPresupuesto_Agente_Movimiento) => {
    return await Presupuesto_Agente_Mov.create({
      id_movimiento_presupuesto_agente: v4(),
      ...data
    });
  },

  // ================================
  // Guardar histórico al cerrar mes
  // ================================
  guardarHistorico: async (data: Omit<IPresupuesto_Agente_Historico, 'id_historial_presupuesto_agente'>) => {
    return await Presupuesto_Agente_Hist.create({
      id_historial_presupuesto_agente: v4(),
      ...data
    });
  },

  // ================================
  // Obtener movimientos de un presupuesto
  // ================================
  getMovimientosByPresupuesto: async (id_presupuesto_agente: string) => {
    return await Presupuesto_Agente_Mov.findAll({
      where: { id_presupuesto_agente }
    });
  },

  // ================================
  // Obtener histórico por agente
  // ================================
  getHistoricoByAgente: async (id_agente: string) => {
    return await Presupuesto_Agente_Hist.findAll({
      include: [
        {
          model: Presupuesto_Agente,
          where: { id_agente },
          attributes: ['mes', 'anio', 'monto_asignado']
        }
      ],
      order: [['fecha_cierre', 'DESC']]
    });
  },

  getAllPresupuestos: async () => {
    return await Presupuesto_Agente.findAll({
      include: [
        {
          model: Agente_de_Venta,
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }]
        }
      ],
      order: [['anio', 'DESC'], ['mes', 'DESC']]
    });
  },

  getPresupuestosActivos: async () => {
    return await Presupuesto_Agente.findAll({
      where: { estatus: 'ABIERTO' },
      include: [
        {
          model: Agente_de_Venta,
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }]
        }
      ],
      order: [['monto_asignado', 'DESC']]
    });
  },

  getMovimientos: async (id_presupuesto_agente: string) => {
    return await Presupuesto_Agente_Mov.findAll({
      where: { id_presupuesto_agente },
      order: [['fecha', 'DESC']]
    });
  },

  // ================================================================
  // VENDIDO REAL — suma total_factura de facturas de tipo I (ingreso)
  // que pertenecen a pedidos del agente en el mes/año del presupuesto.
  // Excluye facturas canceladas.
  // ================================================================
  getVendidoReal: async (id_agente: string, mes: number, anio: number): Promise<number> => {
    const rows = await dbLocal.query<{ total: string }>(
      `SELECT COALESCE(SUM(f.total_factura), 0) AS total
       FROM facturas f
       JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
       WHERE p.id_agente_pedido_alm = :id_agente
         AND f.tipo_cfdi      = 'I'
         AND f.estatus_factura != 'CAN'
         AND EXTRACT(YEAR  FROM f.fecha_emision) = :anio
         AND EXTRACT(MONTH FROM f.fecha_emision) = :mes`,
      {
        replacements: { id_agente, mes, anio },
        type: QueryTypes.SELECT,
      }
    );
    return Number(rows[0]?.total ?? 0);
  },

  // ================================================================
  // RESUMEN COMPLETO de un presupuesto:
  //   monto_asignado, monto_vendido (facturas reales),
  //   monto_ajustes (movimientos manuales), monto_total, porcentaje
  // ================================================================
  getResumen: async (id_presupuesto_agente: string) => {
    const presupuesto = await Presupuesto_Agente.findByPk(id_presupuesto_agente, {
      include: [
        {
          model: Agente_de_Venta,
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }]
        }
      ]
    });
    if (!presupuesto) return null;

    const movimientos = await Presupuesto_Agente_Mov.findAll({
      where: { id_presupuesto_agente },
      order: [['fecha', 'DESC']]
    });

    const monto_ajustes = movimientos.reduce((s, m) => s + Number(m.monto), 0);
    const monto_vendido = await PresupuestoAgenteRepository.getVendidoReal(
      presupuesto.id_agente,
      presupuesto.mes,
      presupuesto.anio
    );

    const monto_total    = monto_vendido + monto_ajustes;
    const monto_asignado = Number(presupuesto.monto_asignado);
    const porcentaje     = monto_asignado > 0 ? (monto_total / monto_asignado) * 100 : 0;

    return {
      presupuesto,
      monto_asignado,
      monto_vendido,
      monto_ajustes,
      monto_total,
      porcentaje,
      movimientos,
    };
  },

  // ================================================================
  // TABLERO — todos los presupuestos activos con su avance real
  // ================================================================
  getTablero: async (mes?: number, anio?: number) => {
    const where: any = {};
    if (mes)  where.mes  = mes;
    if (anio) where.anio = anio;
    if (!mes && !anio) where.estatus = 'ABIERTO'; // sin filtro de periodo → solo activos

    const presupuestos = await Presupuesto_Agente.findAll({
      where,
      include: [
        {
          model: Agente_de_Venta,
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }]
        }
      ],
      order: [['monto_asignado', 'DESC']]
    });

    const resúmenes = await Promise.all(
      presupuestos.map(async p => {
        const monto_ajustes = (await Presupuesto_Agente_Mov.findAll({ where: { id_presupuesto_agente: p.id_presupuesto_agente } }))
          .reduce((s, m) => s + Number(m.monto), 0);
        const monto_vendido = await PresupuestoAgenteRepository.getVendidoReal(p.id_agente, p.mes, p.anio);
        const monto_total   = monto_vendido + monto_ajustes;
        const monto_asignado = Number(p.monto_asignado);
        const porcentaje    = monto_asignado > 0 ? (monto_total / monto_asignado) * 100 : 0;

        return {
          presupuesto: p,
          monto_asignado,
          monto_vendido,
          monto_ajustes,
          monto_total,
          porcentaje,
        };
      })
    );

    return resúmenes;
  },
};
