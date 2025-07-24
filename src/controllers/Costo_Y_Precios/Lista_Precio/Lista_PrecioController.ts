import { Request, Response } from "express";
import { ListaPrecioService } from "../../../services/Costo_Y_Precio/Lista_Precios/Lista_Precios.service";

export class ListaPrecioController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const listas = await ListaPrecioService.getAll();
      res.status(200).json(listas);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener las Detalle Detalle Lista precio", error });
    }
  }

  static getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lista = await ListaPrecioService.getById(id);

      if (!lista) {
        res.status(404).json({ message: "Lista de precio no encontrada" });
      }

      res.status(200).json(lista);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la lista de precios",
        error: (error as Error).message,
      });
    }
  };




  static create = async (req: Request, res: Response) => {
    try {
      const nuevaLista = await ListaPrecioService.create(req.body);
      res.status(201).json(nuevaLista);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error al crear la Lista de precios" });
    }
  }

  static update = async (req: Request, res: Response) => {
    try {
      const { id_lista_precio } = req.params;
      const actualizada = await ListaPrecioService.update(id_lista_precio, req.body);
      if (!actualizada)
        res.status(200).json(actualizada);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar Detalle Lista", error });
    }
  };

}

