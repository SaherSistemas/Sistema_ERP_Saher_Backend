import type { Request, Response } from "express";
import { ReglaOfertaService } from "../../services/Ofertas/ReglaOferta.service";

export class ReglaOfertaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const regla = await ReglaOfertaService.getAll();
      res.status(200).json(regla);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Reglas de Oferta." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const regla = await ReglaOfertaService.getById(id);
      res.status(200).json(regla);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Regla Oferta." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const nuevaRegla = await ReglaOfertaService.create(req.body);
      res.status(201).json(nuevaRegla);

    } catch (error: any) {
      console.error("Error creando regla:", error);
      res.status(400).json({ mensaje: error.message });
    }
  };


  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const regla = await ReglaOfertaService.update(id, data);
      res.status(200).json(regla);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar Regla Oferta." });
    }
  };
}
