import { Request, Response } from 'express';
import { Cat_Riesgo_PuestoService } from '../services/Cat_Riesgo_Puesto.service';
import { IUpdateCat_Riesgo_Puesto } from '../interface/Cat_Riesgo_Puesto.interface';

export class Cat_Riesgo_PuestoController {
    static getAll = async (_req: Request, res: Response) => {
        const data = await Cat_Riesgo_PuestoService.getAll();
        res.status(201).json({ mensaje: data })
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const data = await Cat_Riesgo_PuestoService.getById(req.params.id);
            res.status(201).json(data)
        } catch (error) {
            res.status(404).json({ mensaje: error.message });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const created = await Cat_Riesgo_PuestoService.create(req.body);
            res.status(201).json({ mensaje: "Riesgo creado correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }

    static update = async (req: Request, res: Response) => {
        try {
            const data: IUpdateCat_Riesgo_Puesto = req.body
            const updated = await Cat_Riesgo_PuestoService.update(req.params.id, data);
            res.status(201).json({ mensaje: "Riesgo puesto actualizado correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }
};
