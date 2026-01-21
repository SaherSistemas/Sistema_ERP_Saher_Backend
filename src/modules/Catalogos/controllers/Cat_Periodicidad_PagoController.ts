import { Request, Response } from 'express';
import { Cat_Periodicidad_Pago } from '../services/Cat_Periodicidad_Pago.service';
import { IUpdateCat_Periodicidad_Pago } from '../interface/Cat_Periodicidad_Pago.interface';

export class Cat_Periodicidad_PagoController {
    static getAll = async (_req: Request, res: Response) => {
        const data = await Cat_Periodicidad_Pago.getAll();
        res.status(201).json({ mensaje: data })
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const data = await Cat_Periodicidad_Pago.getById(req.params.id);
            res.status(201).json(data)
        } catch (error) {
            res.status(404).json({ mensaje: error.message });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const created = await Cat_Periodicidad_Pago.create(req.body);
            res.status(201).json({ mensaje: "Periodicidad creada correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }

    static update = async (req: Request, res: Response) => {
        try {
            const data: IUpdateCat_Periodicidad_Pago = req.body
            const updated = await Cat_Periodicidad_Pago.update(req.params.id, data);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }
};
