import type { Request, Response } from "express";
import { ICreateOrUpdatePrioridad_Artiulo, IPrioridad_Articulo } from "../interface/Prioridad_Articulo.interface";
import { Prioridad_ArticuloService } from "../services/prioridad_Articulo.service";

export class Prioridad_ArticuloController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todasLasPrioridades = await Prioridad_ArticuloService.getAll();
            res.status(200).json({ mensaje: todasLasPrioridades });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener la prioridades." })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const createNewPrioridad = await Prioridad_ArticuloService.createPrioridad(data);
            res.status(201).json({ mensaje: 'Tipo de IVA creado correctamente.', tipoIVA: createNewPrioridad })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al crear el tipo de IVA.' })
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_prioridad } = req.params;
            const data: ICreateOrUpdatePrioridad_Artiulo = req.body;
            const updatePrioridad = await Prioridad_ArticuloService.updatePrioridad(Number(id_prioridad), data)
            res.status(200).json({ mensaje: 'Tipo de IVA actualizado correctamente.', tipoIVA: updatePrioridad });
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al actualizar el tipo de IVA.' })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_prioridad } = req.params;
            const prioridad = await Prioridad_ArticuloService.getByID(Number(id_prioridad));
            res.status(200).json(prioridad)
        } catch (error) {
            res.status(500).json({ mensaje: "Error al encontrar el IVA" })
        }
    }
}