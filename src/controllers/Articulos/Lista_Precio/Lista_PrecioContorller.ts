import { Request, Response } from "express";
import { ListaPreciosService } from "../../../services/Articulos/Lista_Precios/Lista_Precios.service";

export class ListaPreciosController {
  static getAll = async (_req: Request, res: Response) => {
    try {
      const listas = await ListaPreciosService.getAll();
      res.status(200).json(listas);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las listas de precios", error });
    }
  };

  static getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lista = await ListaPreciosService.getById(id);
      if (!lista) return res.status(404).json({ message: "Lista no encontrada" });
      res.status(200).json(lista);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener la lista", error });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const nuevaLista = await ListaPreciosService.create(req.body);
      res.status(201).json(nuevaLista);
    } catch (error) {
      res.status(500).json({ message: "Error al crear la lista de precios", error });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actualizada = await ListaPreciosService.update(id, req.body);
      if (!actualizada) return res.status(404).json({ message: "Lista no encontrada" });
      res.status(200).json(actualizada);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar la lista", error });
    }
  };

  // static delete = async (req: Request, res: Response) => {
  //   try {
  //     const { id } = req.params;
  //     const eliminada = await ListaPreciosService.delete(id);
  //     if (!eliminada) return res.status(404).json({ message: "Lista no encontrada" });
  //     res.status(200).json({ message: "Lista eliminada correctamente" });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error al eliminar la lista", error });
  //   }
  // };
}

