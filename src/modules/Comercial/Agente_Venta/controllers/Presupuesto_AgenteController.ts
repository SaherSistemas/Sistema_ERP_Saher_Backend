import { Request, Response } from 'express';
import { PresupuestoAgenteService } from '../services/Presupuesto_Agente.service';
import { AuthedRequest } from '../../../../middleware/auth';

export const PresupuestoAgenteController = {

  // ── Crear presupuesto del agente ──────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await PresupuestoAgenteService.create(data);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error al crear presupuesto del agente:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Obtener presupuesto activo ────────────────────────────────
  getActivo: async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const result = await PresupuestoAgenteService.getActivo(id_agente);
      if (!result) {
        res.status(404).json({ message: 'No existe un presupuesto activo para este agente.' });
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al obtener presupuesto activo:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Resumen completo de un presupuesto (vendido real + ajustes) ─
  // GET /presupuesto_agente/:id_presupuesto_agente/resumen
  getResumen: async (req: Request, res: Response) => {
    try {
      const { id_presupuesto_agente } = req.params;
      const resumen = await PresupuestoAgenteService.getResumen(id_presupuesto_agente);
      res.status(200).json(resumen);
    } catch (error: any) {
      console.error('Error al obtener resumen:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Registrar ajuste manual ──────────────────────────────────
  // POST /presupuesto_agente/:id_presupuesto_agente/ajuste
  registrarAjuste: async (req: Request, res: Response) => {
    try {
      const { id_presupuesto_agente } = req.params;
      const result = await PresupuestoAgenteService.registrarAjuste({
        ...req.body,
        id_presupuesto_agente,
        tipo_movimiento: 'ajuste',
        fecha: new Date(),
      });
      res.status(201).json({ message: 'Ajuste registrado.', movimiento: result });
    } catch (error: any) {
      console.error('Error al registrar ajuste:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Cerrar mes del agente ─────────────────────────────────────
  cerrarMes: async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const result = await PresupuestoAgenteService.cerrarMes(id_agente);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al cerrar mes del agente:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Historial por agente ──────────────────────────────────────
  getHistorico: async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const data = await PresupuestoAgenteService.getHistorico(id_agente);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message || 'Error al obtener el historial del agente.' });
    }
  },

  // ── Todos los presupuestos ────────────────────────────────────
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await PresupuestoAgenteService.getAll();
      res.status(200).json(data);
    } catch (e) {
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
  },

  // ── Mi resumen (agente logueado — usa JWT) ───────────────────
  // GET /presupuesto_agente/mi-resumen   (authMiddleware requerido)
  getMiResumen: async (req: AuthedRequest, res: Response) => {
    try {
      const id_empleado = req.user!.id_referencia_persona;
      const data = await PresupuestoAgenteService.getMiResumen(id_empleado);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Error al obtener mi resumen de presupuesto:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Mi histórico (agente logueado — usa JWT) ─────────────────
  // GET /presupuesto_agente/mi-historico   (authMiddleware requerido)
  getMiHistorico: async (req: AuthedRequest, res: Response) => {
    try {
      const id_empleado = req.user!.id_referencia_persona;
      const data = await PresupuestoAgenteService.getMiHistorico(id_empleado);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Error al obtener mi histórico de presupuesto:', error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
    }
  },

  // ── Tablero general con avance real ──────────────────────────
  // GET /presupuesto_agente/tablero?mes=5&anio=2026
  getTablero: async (req: Request, res: Response) => {
    try {
      const { mes, anio } = req.query as { mes?: string; anio?: string };
      const data = await PresupuestoAgenteService.getTablero(
        mes  ? Number(mes)  : undefined,
        anio ? Number(anio) : undefined,
      );
      res.status(200).json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: 'Error al obtener el tablero de presupuestos' });
    }
  },
};
