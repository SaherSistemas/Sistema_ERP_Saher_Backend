import { Request, Response } from "express";
import { DetalleListaPrecioService } from "../services/Detalle_Lista_Precio.service";

export class DetalleListaPrecioController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const listas = await DetalleListaPrecioService.getAll();
      res.status(200).json(listas);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las Detalle Detalle Lista precio", error });
    }
  };

  static getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lista = await DetalleListaPrecioService.getById(id);
      if (!lista) return res.status(404).json({ message: "Detalle Lista no encontrada" });
      res.status(200).json(lista);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener Detalle Lista precio", error });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const nuevaLista = await DetalleListaPrecioService.create(req.body);
      res.status(201).json(nuevaLista);
    } catch (error) {
      res.status(500).json({ message: "Error al crear la Lista de precios", error });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const actualizada = await DetalleListaPrecioService.update(req.body);
      if (!actualizada)
        res.status(200).json(actualizada);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar Detalle Lista", error });
    }
  };

}

