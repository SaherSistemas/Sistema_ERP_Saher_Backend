import { Request, Response } from 'express';
import { Cat_Tipo_JorandaService } from '../services/Cat_Tipo_Jornada.service';

export class Cat_Tipo_JornadaController {
    static getAll = async (_req: Request, res: Response) => {
        const data = await Cat_Tipo_JorandaService.getAll();
        res.status(201).json({ mensaje: data })
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const data = await Cat_Tipo_JorandaService.getById(req.params.id);
            res.status(201).json(data)
        } catch (error) {
            res.status(404).json({ mensaje: error.message });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const created = await Cat_Tipo_JorandaService.create(req.body);
            res.status(201).json({ mensaje: "Tipo de jornado creado correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }

    static update = async (req: Request, res: Response) => {
        try {
            const updated = await Cat_Tipo_JorandaService.update(req.params.id, req.body);
            res.status(201).json({ mensaje: "Tipo de jornada actualizada correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }
};
