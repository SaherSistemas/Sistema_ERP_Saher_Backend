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
      const nuevaOferta = await AlcanceOfertaService.create(req.body);
      res.status(201).json(nuevaOferta);
    } catch (error: any) {
      console.error("Error creando alcance:", error);
      res.status(error?.status || 400).json({
        error: true,
        message: error?.message || "Error al crear alcance"
      });
    }
  }


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
