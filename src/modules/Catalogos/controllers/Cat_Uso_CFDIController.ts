import { Request, Response } from 'express';
import { CatUsoCFDIService } from '../services/Cat_Uso_CFDI.service';

export const CatUsoCFDIController = {
  getAll: async (_req: Request, res: Response) => {
    const data = await CatUsoCFDIService.getAll();
    res.json(data);
  },

  getById: async (req: Request, res: Response) => {
    try {
      const data = await CatUsoCFDIService.getById(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  },

  create: async (req: Request, res: Response) => {
    const data = await CatUsoCFDIService.create(req.body);
    res.status(201).json(data);
  },

  update: async (req: Request, res: Response) => {
    try {
      await CatUsoCFDIService.update(req.params.id, req.body);
      res.json({ message: 'Actualizado correctamente' });
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await CatUsoCFDIService.delete(req.params.id);
      res.json({ message: 'Eliminado correctamente' });
    } catch (e: any) {
      res.status(e.status || 500).json({ message: e.message });
    }
  }
};
