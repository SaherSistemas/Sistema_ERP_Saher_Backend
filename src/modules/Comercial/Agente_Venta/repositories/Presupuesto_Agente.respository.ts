import { v4 } from 'uuid';
import Presupuesto_Agente from '../model/Presupuesto_Agente';
import {
  IPresupuesto_Agente_Historico,
  IPresupuesto_Agente_Movimiento,
  IPresupuesto_AgenteCreate
} from '../interface/Presupuesto_Agente.interface';
import Presupuesto_Agente_Mov from '../model/Presupuesto_Agente_Mov';
import Presupuesto_Agente_Hist from '../model/Presupuesto_Agente_Hist';
import Agente_de_Venta from '../model/Agente_De_Venta';

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
  // Insertar movimiento
  // ================================
  registrarMovimiento: async (data: IPresupuesto_Agente_Movimiento) => {
    return await Presupuesto_Agente_Mov.create({
      id_movimiento: v4(),
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
  //  OBTENER TODOS LO MOVIMIENTOS DE UN PRESUPUESTO
  // ================================
  getMovimientosByPresupuesto: async (id_presupuesto_agente: string) => {
    return await Presupuesto_Agente_Mov.findAll({
      where: { id_presupuesto_agente }
    });
  },
  // ================================
  //  OBTENER UN HISTORICO POR AGENTE
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
      include: [{ model: Agente_de_Venta }],
      order: [
        ['anio', 'DESC'],
        ['mes', 'DESC']
      ]
    });
  },
  getPresupuestosActivos: async () => {
    return await Presupuesto_Agente.findAll({
      where: { estatus: 'ABIERTO' },
      include: [{ model: Agente_de_Venta }],
      order: [['monto_asignado', 'DESC']]
    });
  },
  getMovimientos: async (id_presupuesto_agente: string) => {
    return await Presupuesto_Agente_Mov.findAll({
      where: { id_presupuesto_agente },
      order: [['fecha', 'DESC']]
    });
  }
};
