import type { Request, Response } from "express";
import { UsoOfertaService } from "../../services/Ofertas/UsoOferta.service"; 

export class UsoOfertaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const usos = await UsoOfertaService.getAll();
    res.status(200).json(usos);

    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todas los usos." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uso = await UsoOfertaService.getById(id);
      res.status(200).json(uso);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Uso." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevo_uso = await UsoOfertaService.create(data);
      res.status(201).json(nuevo_uso);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear Uso." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const uso_actualizado = await UsoOfertaService.update(id, data);
      res.status(200).json(uso_actualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar Uso." });
    }
  };
}
