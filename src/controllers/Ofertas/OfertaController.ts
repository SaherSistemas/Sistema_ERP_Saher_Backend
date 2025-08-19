import type { Request, Response } from "express";
import { OfertaService } from "../../services/Ofertas/Ofertas.service";

export class OfertaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const oferta = await OfertaService.getAll();
       res.status(200).json(oferta);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todas las ofertas." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const oferta = await OfertaService.getById(id);
      res.status(200).json(oferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Oferta." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevaoferta = await OfertaService.create(data);
      res.status(201).json(nuevaoferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear Nueva Oferta." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const oferta_actualizada = await OfertaService.update(id, data);
      res.status(200).json(oferta_actualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar Oferta." });
    }
  };
}
