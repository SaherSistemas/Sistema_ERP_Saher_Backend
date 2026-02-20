import { Request, Response } from "express";
import { Margen_Ganancia_ListaService } from "../services/Margen_Ganancia_Lista.service";
export class Margen_Ganancia_ListaController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const listas = await Margen_Ganancia_ListaService.getAll();
            res.status(200).json(listas);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las Margen de Ganancia Lista", error });
        }
    };

    static getPorProducto = async (req: Request, res: Response) => {
        try {
            const { id_categoria, id_presentacion } = req.params;
            const lista = await Margen_Ganancia_ListaService.getPorProducto(id_categoria, id_presentacion);
            res.status(200).json(lista);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener la Margen de Ganancia Lista por producto", error });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const nuevaLista = await Margen_Ganancia_ListaService.create(req.body);
            res.status(201).json(nuevaLista);
        } catch (error) {
            res.status(500).json({ message: "Error al crear la Margen de Ganancia Lista", error });
        }
    };

    static update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const actualizada = await Margen_Ganancia_ListaService.update(id, req.body);
            res.status(200).json(actualizada);
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar Margen de Ganancia Lista", error });
        }
    };

}

