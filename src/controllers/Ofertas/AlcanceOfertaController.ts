import type { Request, Response } from "express";
import { AlcanceOfertaService } from "../../services/Ofertas/AlcanceOferta.service";

export class AlcanceOfertaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const alcance = await AlcanceOfertaService.getAll();
      res.status(200).json(alcance);

    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar todas los Alcances." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const alcance = await AlcanceOfertaService.getById(id);
      res.status(200).json(alcance);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Alcance." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevaoferta = await AlcanceOfertaService.create(data);
      res.status(201).json(nuevaoferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear Alcance." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const alcance = await AlcanceOfertaService.update(id, data);
      res.status(200).json(alcance);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar Alcance." });
    }
  };
}
