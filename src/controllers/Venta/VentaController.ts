import type { Request, Response } from "express";
import { VentaService } from "../../services/Venta/Venta.service";

export class VentaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const cajas = await VentaService.getAll();
      res.status(200).json(cajas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar todas las Ventas." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const venta = await VentaService.getById(id);
      res.status(200).json(venta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar la Venta." });
    }
  };

  static create = async (req: Request, res: Response) => {

    const data =  req.body;


    try {
      const nuevaVenta = await VentaService.create(data);
      // console.log(data);

      res.status(201).json(nuevaVenta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear la Venta." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const actualizado = await VentaService.update(id, data);
      res.status(200).json(actualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar la Venta." });
    }
  };
}
