import type { Request, Response } from "express";
import { RecetaMedicaService } from "../../services/RecetaMedica/RecetaMedica.service";

export class RecetaMedicaController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const recetas = await RecetaMedicaService.getAll();
            res.status(200).json(recetas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar recetas medicas." });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevaReceta = await RecetaMedicaService.createFromVenta(data);
            res.status(201).json(nuevaReceta);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear la Receta." });
        }
    }

   
}
