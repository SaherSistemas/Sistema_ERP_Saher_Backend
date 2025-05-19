import type { Request, Response } from "express";
import { ColoniaService } from "../../services/Lugares/colonia.service";
import { ICreateColonia, IUpdateColonia } from "../../interface/Lugares/Colonia.interface";
import { IUpdateCiudad } from "../../interface/Lugares/Ciudades.interface";


export class ColoniaController {
    static getAllColonias = async (req: Request, res: Response) => {
        try {
            const todasColonias = await ColoniaService.getAllCiudad();
            res.status(201).json({ mensaje: todasColonias })
        } catch (error) {
            //    console.error(error)
            res.status(500).json({ message: "Error al obtener las colonias" })
        }
    }
    static coloniasConCiudad = async (req: Request, res: Response) => {
        try {
            const { id_ciuda_colonia } = req.params;
            const coloniasPorCiudad = await ColoniaService.getColoniasPorCiudad(id_ciuda_colonia);
            res.status(201).json(coloniasPorCiudad)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener las colonias de la ciudad." })
        }
    }

    static getColoniaById = async (req: Request, res: Response) => {
        try {
            const { id_colonia } = req.params;
            const colonia = await ColoniaService.getColoniaByID(id_colonia);
            res.status(201).json(colonia)
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "No se encontro la ciudad." })
        }
    }

    static crearColonia = async (req: Request<ICreateColonia>, res: Response) => {
        try {
            const data = req.body
            const newColonia = await ColoniaService.createColonia(data)
            res.status(201).json({ mensaje: "Colonia creada correctamente.", colonia: newColonia })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al crear la colonia." })
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_colonia } = req.params;
            const data: IUpdateColonia = req.body;
            const updatedColonia = await ColoniaService.updateColonia(id_colonia, data)
            res.status(201).json({ mensaje: "Colonia actualizada correctamente", colonia: updatedColonia })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar la colonia" })
        }
    }

    static cambiarStatus = async (req: Request, res: Response) => {
        try {
            const { id_colonia } = req.params;
            const updateStatusColonia = await ColoniaService.cambiarStatus(id_colonia);
            res.status(201).json({ mensaje: "Se cambio el estatus de la colonia correctamente", colonia: updateStatusColonia })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "Error no se pudo cambiar el estatus de la colonia" })
        }
    }
}