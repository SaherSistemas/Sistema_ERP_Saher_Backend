import type { Request, Response } from "express";
import { TemporabilidadService } from "../../services/Articulos/temporabilidad.service";
import { ICreateOrUpdateTemporabilidad } from "../../interface/Articulos/Temporabilidad.interface";

export class TemporabilidadController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todasTemporabilidades = await TemporabilidadService.getAll();
            res.status(200).json({ mensaje: todasTemporabilidades });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las temporabilidades." })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const createNewTemporabilidad = await TemporabilidadService.createTemporabilidad(data);
            res.status(201).json({ mensaje: 'Temporabilidad creada correctamente.', tipoIVA: createNewTemporabilidad })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al crear la temporabilidad.' })
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_tempo } = req.params;
            const data: ICreateOrUpdateTemporabilidad = req.body;
            const updateTemporabilidad = await TemporabilidadService.updateTemporabilidad(Number(id_tempo), data)
            res.status(200).json({ mensaje: 'Temporabilidad actualizada correctamente.', temporabilidad: updateTemporabilidad });
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al actualizar el tipo de IVA.' })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_tempo } = req.params;
            const temporabilidad = await TemporabilidadService.getByID(Number(id_tempo));
            res.status(200).json(temporabilidad)
        } catch (error) {
            res.status(500).json({ mensaje: "Error al encontrar la temporabilidad." })
        }
    }
}