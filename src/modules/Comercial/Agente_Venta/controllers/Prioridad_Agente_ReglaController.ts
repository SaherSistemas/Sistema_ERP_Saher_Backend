import { Request, Response } from 'express';
import { PrioridadAgenteReglasService } from '../services/Prioridad_Agente_Reglas.service';

export const PrioridadAgenteReglasController = {
  getByAgente: async (req: Request, res: Response) => {
    try {
      const reglas = await PrioridadAgenteReglasService.getByAgente(req.params.id_agente);
      res.json(reglas);
    } catch (e) {
      res.status(500).json({ message: 'Error al obtener reglas del agente' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const nueva = await PrioridadAgenteReglasService.create(req.body);
      res.status(201).json(nueva);
    } catch (e) {
      res.status(500).json({ message: 'Error al crear regla' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      await PrioridadAgenteReglasService.update(req.params.id_regla, req.body);
      res.json({ message: 'Regla actualizada' });
    } catch (e) {
      res.status(500).json({ message: 'Error al actualizar regla' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await PrioridadAgenteReglasService.delete(req.params.id_regla);
      res.json({ message: 'Regla eliminada' });
    } catch (e) {
      res.status(500).json({ message: 'Error al eliminar regla' });
    }
  }
};
