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
  // VENDIDO REAL — suma total_factura de facturas de tipo I (ingreso) más
  // el total de remisiones (clientes público general/mostrador).
  //
  // Un pedido de público general NUNCA genera una factura al vender —
  // solo la Remisión (ver crearCxCyRemision en factura.helper.ts). Cada
  // abono posterior genera SU PROPIA factura prorateada para ese pedido,
  // pero eso es papeleo del cobro, no una venta nueva: el total_remision
  // ya representa la venta completa desde el día que se generó. Por eso:
  //   - Remisiones: se suman TODAS (menos canceladas), sin importar
  //     cuántas facturas de abono se le hayan generado después.
  //   - Facturas: se excluyen las que pertenecen a un pedido que tiene
  //     una Remisión asociada (esas son las facturas de abono — ya están
  //     contadas vía la Remisión). Solo cuentan las facturas de venta
  //     directa normal (pedidos que nunca pasaron por Remisión).
  // Sin este NOT EXISTS, cada abono duplicaría lo ya contado en la Remisión.
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
         AND EXTRACT(MONTH FROM f.fecha_emision) = :mes
         AND NOT EXISTS (SELECT 1 FROM remision r WHERE r.id_pedido_alm = f.id_pedido_alm)`,
      {
        replacements: { id_agente, mes, anio },
        type: QueryTypes.SELECT,
      }
    );

    const rowsRemision = await dbLocal.query<{ total: string }>(
      `SELECT COALESCE(SUM(r.total_remision), 0) AS total
       FROM remision r
       WHERE r.id_agente = :id_agente
         AND r.estatus_remision != 'CAN'
         AND EXTRACT(YEAR  FROM r.fecha_remision) = :anio
         AND EXTRACT(MONTH FROM r.fecha_remision) = :mes`,
      {
        replacements: { id_agente, mes, anio },
        type: QueryTypes.SELECT,
      }
    );

    return Number(rows[0]?.total ?? 0) + Number(rowsRemision[0]?.total ?? 0);
  },

  // ================================================================
  // DETALLE del vendido — el listado de facturas y remisiones que arman
  // el monto_vendido de getVendidoReal, para poder auditar/ver de dónde
  // sale el número (misma exclusión: las facturas de un pedido con
  // remisión asociada no se listan aparte, ya están dentro de esa remisión).
  // ================================================================
  getDetalleVendido: async (id_agente: string, mes: number, anio: number) => {
    const facturas = await dbLocal.query<{
      id_factura: string; folio_factura: string; fecha_emision: string;
      total_factura: string; cliente: string;
    }>(
      `SELECT f.id_factura, f.folio_factura, f.fecha_emision, f.total_factura,
              COALESCE(ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm) AS cliente
       FROM facturas f
       JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
       JOIN cliente_almacen ca ON ca.id_cliente_alm = f.id_cliente_alm
       WHERE p.id_agente_pedido_alm = :id_agente
         AND f.tipo_cfdi      = 'I'
         AND f.estatus_factura != 'CAN'
         AND EXTRACT(YEAR  FROM f.fecha_emision) = :anio
         AND EXTRACT(MONTH FROM f.fecha_emision) = :mes
         AND NOT EXISTS (SELECT 1 FROM remision r WHERE r.id_pedido_alm = f.id_pedido_alm)
       ORDER BY f.fecha_emision DESC`,
      { replacements: { id_agente, mes, anio }, type: QueryTypes.SELECT }
    );

    const remisiones = await dbLocal.query<{
      id_remision: string; folio_remision: number; fecha_remision: string;
      total_remision: string; estatus_remision: string; cliente: string;
    }>(
      `SELECT r.id_remision, r.folio_remision, r.fecha_remision, r.total_remision, r.estatus_remision,
              COALESCE(ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm) AS cliente
       FROM remision r
       JOIN cliente_almacen ca ON ca.id_cliente_alm = r.id_cliente_alm
       WHERE r.id_agente = :id_agente
         AND r.estatus_remision != 'CAN'
         AND EXTRACT(YEAR  FROM r.fecha_remision) = :anio
         AND EXTRACT(MONTH FROM r.fecha_remision) = :mes
       ORDER BY r.fecha_remision DESC`,
      { replacements: { id_agente, mes, anio }, type: QueryTypes.SELECT }
    );

    return { facturas, remisiones };
  },

  // ================================================================
  // VENDIDO POR DÍA — lo mismo que getVendidoReal (facturas de venta directa + remisiones, sin canceladas) pero
  // desglosado por día del mes, más los ajustes manuales con fecha dentro del mes. Devuelve todos los días del mes;
  // los ajustes con fecha fuera del mes (si los hay) se reportan aparte para que el total siga cuadrando.
  // ================================================================
  getVendidoPorDia: async (id_agente: string, mes: number, anio: number, id_presupuesto_agente?: string | null) => {
    const diasMes = new Date(anio, mes, 0).getDate();
    const replacements = { id_agente, mes, anio };

    const facturas = await dbLocal.query<{ dia: number; total: string; docs: string }>(
      `SELECT EXTRACT(DAY FROM f.fecha_emision)::int AS dia, SUM(f.total_factura) AS total, COUNT(*) AS docs
       FROM facturas f
       JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
       WHERE p.id_agente_pedido_alm = :id_agente
         AND f.tipo_cfdi      = 'I'
         AND f.estatus_factura != 'CAN'
         AND EXTRACT(YEAR  FROM f.fecha_emision) = :anio
         AND EXTRACT(MONTH FROM f.fecha_emision) = :mes
         AND NOT EXISTS (SELECT 1 FROM remision r WHERE r.id_pedido_alm = f.id_pedido_alm)
       GROUP BY 1`,
      { replacements, type: QueryTypes.SELECT }
    );

    const remisiones = await dbLocal.query<{ dia: number; total: string; docs: string }>(
      `SELECT EXTRACT(DAY FROM r.fecha_remision)::int AS dia, SUM(r.total_remision) AS total, COUNT(*) AS docs
       FROM remision r
       WHERE r.id_agente = :id_agente
         AND r.estatus_remision != 'CAN'
         AND EXTRACT(YEAR  FROM r.fecha_remision) = :anio
         AND EXTRACT(MONTH FROM r.fecha_remision) = :mes
       GROUP BY 1`,
      { replacements, type: QueryTypes.SELECT }
    );

    let ajustes: { dia: number | null; total: string }[] = [];
    if (id_presupuesto_agente) {
      ajustes = await dbLocal.query<{ dia: number | null; total: string }>(
        `SELECT CASE WHEN EXTRACT(YEAR FROM m.fecha) = :anio AND EXTRACT(MONTH FROM m.fecha) = :mes
                     THEN EXTRACT(DAY FROM m.fecha)::int END AS dia,
                SUM(m.monto) AS total
         FROM presupuesto_agente_mov m
         WHERE m.id_presupuesto_agente = :id_presupuesto_agente
         GROUP BY 1`,
        { replacements: { ...replacements, id_presupuesto_agente }, type: QueryTypes.SELECT }
      );
    }

    const dias = Array.from({ length: diasMes }, (_, i) => ({
      dia: i + 1,
      fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      facturas: 0,
      remisiones: 0,
      ajustes: 0,
      documentos: 0,
    }));
    for (const f of facturas) { const d = dias[f.dia - 1]; if (d) { d.facturas = Number(f.total); d.documentos += Number(f.docs); } }
    for (const r of remisiones) { const d = dias[r.dia - 1]; if (d) { d.remisiones = Number(r.total); d.documentos += Number(r.docs); } }
    let ajustes_fuera_mes = 0;
    for (const a of ajustes) {
      if (a.dia == null) ajustes_fuera_mes += Number(a.total);
      else if (dias[a.dia - 1]) dias[a.dia - 1].ajustes = Number(a.total);
    }

    return {
      dias: dias.map(d => ({ ...d, vendido: +(d.facturas + d.remisiones + d.ajustes).toFixed(2) })),
      ajustes_fuera_mes,
    };
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
