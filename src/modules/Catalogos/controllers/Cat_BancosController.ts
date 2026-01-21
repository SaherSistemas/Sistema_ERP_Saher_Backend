import { Request, Response } from 'express';
import { Cat_BancoService } from '../services/Cat_Bancos.service';
import { IUpdateCat_Bancos } from '../interface/Cat_Bancos.interface';

export class Cat_BancosController {
    static getAll = async (_req: Request, res: Response) => {
        const data = await Cat_BancoService.getAll();
        res.status(201).json({ mensaje: data })
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const data = await Cat_BancoService.getById(req.params.id);
            res.status(201).json(data)
        } catch (error) {
            res.status(404).json({ mensaje: error.message });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const created = await Cat_BancoService.create(req.body);
            res.status(201).json({ mensaje: "Banco creado correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }
    static update = async (req: Request, res: Response) => {
        try {
            const data: IUpdateCat_Bancos = req.body;
            const updated = await Cat_BancoService.update(req.params.id, data);
            res.status(201).json({ mensaje: "Banco actualizado correctamente." })
        } catch (error) {
            res.status(400).json({ mensaje: error.message });
        }
    }
};
