import type { Request, Response } from "express";
import { presentacion_ArticuloService } from "../services/presentacion_Articulo.service";

export class Presentacion_ArticuloController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todasLasPresentaciones = await presentacion_ArticuloService.getAll();
            res.status(200).json({ mensaje: todasLasPresentaciones })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todas las presentaciones." })
        }
    }
    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_presentacion } = req.params;
            const subcategoria = await presentacion_ArticuloService.getByID(id_presentacion)
            res.status(200).json(subcategoria)
        } catch (error) {
            // console.error( error);
            res.status(500).json({ mensaje: "Error al encontrar la presentacion." });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newPresentacion = await presentacion_ArticuloService.createPresentacion_Articulo(data);
            res.status(201).json({ mensaje: 'La subcategoria fue creada correctamente.', presentacion: newPresentacion })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la subcategoria." });
        }
    }

    static actualizarByID = async (req: Request, res: Response) => {
        try {
            const { id_presentacion } = req.params;
            const data = req.body;
            const presentacion = await presentacion_ArticuloService.updateByID(id_presentacion, data);
            res.status(200).json({ mensaje: 'La subcategoria actualizada correctamente.', presentacion: presentacion })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al actualizar la presentacion." })
        }
    }
}