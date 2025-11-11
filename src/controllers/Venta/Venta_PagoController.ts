import type { Request, Response } from "express";
import { VentaPagoService } from "../../services/Venta/Venta_Pago.service";

export class VentaPagoController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const ventaPago = await VentaPagoService.getAll();
      res.status(200).json(ventaPago);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Venta Pago." });
    }
  };
  static getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ventaPago = await VentaPagoService.getById(id);

      if (!ventaPago) {
        res.status(404).json({ message: 'Venta pago no encontrada' });
      }
      res.status(200).json(ventaPago);
    } catch (error) {
      console.error('Error en getById Venta_Pago:', error);
      res.status(500).json({ message: 'Error al obtener la venta pago', error: error.message });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const ventaPago = await VentaPagoService.create(data);
      res.status(201).json(ventaPago);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear ventaPago." });
    }
  };
}
