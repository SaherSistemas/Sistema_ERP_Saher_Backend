import type { Request, Response } from 'express';
import { Cat_Metodo_PagoService } from '../services/Cat_Metodo_Pago.service';

export class Cat_Metodo_PagoController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const metodosPago = await Cat_Metodo_PagoService.getAll();
      res.status(200).json(metodosPago);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los métodos de pago.' });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_metodo_pago } = req.params;
      const metodoPago = await Cat_Metodo_PagoService.getByID(id_metodo_pago);
      res.status(200).json(metodoPago);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar el método de pago.' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoMetodoPago = await Cat_Metodo_PagoService.createMetodoPago(data);
      res.status(201).json(nuevoMetodoPago);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al crear el método de pago.' });
    }
  };
}
