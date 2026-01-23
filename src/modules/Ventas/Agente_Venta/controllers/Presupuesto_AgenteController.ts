import { Request, Response } from 'express';
import { PresupuestoAgenteService } from '../services/Presupuesto_Agente.service';

export const PresupuestoAgenteController = {
  // ===================================================
  // Crear presupuesto del agente
  // ===================================================
  create: async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await PresupuestoAgenteService.create(data);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error al crear presupuesto del agente:', error);
      res.status(error.status || 500).json({
        message: error.message || 'Error interno del servidor'
      });
    }
  },

  // ===================================================
  // Obtener presupuesto activo
  // ===================================================
  getActivo: async (req: Request, res: Response) => {
    // console.log('OBTENER ACTIVOS');
    try {
      const { id_agente } = req.params;
      //  console.log(id_agente);
      const result = await PresupuestoAgenteService.getActivo(id_agente);

      if (!result) {
        res.status(404).json({ message: 'No existe un presupuesto activo para este agente.' });
        return;
      }
      //console.log(result);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al obtener presupuesto activo:', error);
      res.status(error.status || 500).json({
        message: error.message || 'Error interno del servidor'
      });
    }
  },

  // ===================================================
  // Cerrar mes del agente
  // ===================================================
  cerrarMes: async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;

      const result = await PresupuestoAgenteService.cerrarMes(id_agente);

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al cerrar mes del agente:', error);
      res.status(error.status || 500).json({
        message: error.message || 'Error interno del servidor'
      });
    }
  },
  // ===================================================
  // oBTENER HISTORICO POR AGENTE
  // ===================================================

  getHistorico: async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;

      const data = await PresupuestoAgenteService.getHistorico(id_agente);

      res.status(200).json(data);
    } catch (error: any) {
      res.status(error.status || 500).json({
        message: error.message || 'Error al obtener el historial del agente.'
      });
    }
  },
  getAll: async (req: Request, res: Response) => {
    try {
      console.log('ENTOR');
      const data = await PresupuestoAgenteService.getAll();
      res.status(200).json(data);
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Error al obtener los presupuestos' });
    }
  },

  getActivos: async (req: Request, res: Response) => {
    try {
      const data = await PresupuestoAgenteService.getActivos();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: 'Error al obtener los presupuestos activos' });
    }
  },

  getMovimientos: async (req: Request, res: Response) => {
    try {
      const { id_presupuesto_agente } = req.params;
      const data = await PresupuestoAgenteService.getMovimientos(id_presupuesto_agente);
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: 'Error al obtener movimientos' });
    }
  }
};
