import { Request, Response } from 'express';
import { CatFormaPagoService } from '../services/Cat_Forma_De_Pago.service';

export const CatFormaPagoController = {
  getAll: async (_req: Request, res: Response) => {
    const data = await CatFormaPagoService.getAll();
    res.json(data);
  },

  getById: async (req: Request, res: Response) => {
    try {
      const data = await CatFormaPagoService.getById(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  },

  create: async (req: Request, res: Response) => {
    const data = await CatFormaPagoService.create(req.body);
    res.status(201).json(data);
  },

  update: async (req: Request, res: Response) => {
    try {
      await CatFormaPagoService.update(req.params.id, req.body);
      res.json({ message: 'Actualizado correctamente' });
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await CatFormaPagoService.delete(req.params.id);
      res.json({ message: 'Eliminado correctamente' });
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  }
};
