import type { Request, Response } from 'express';
import { ConfiguracionService } from '../services/Configuracion.service';

export class ConfiguracionController {

    static getAll = async (_req: Request, res: Response) => {
        try {
            const configs = await ConfiguracionService.getAll();
            res.json({ configs });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    static getByClave = async (req: Request, res: Response) => {
        try {
            const config = await ConfiguracionService.getByClave(req.params.clave);
            res.json(config);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    static create = async (req: Request, res: Response) => {
        try {
            const { clave, valor, tipo, categoria, descripcion } = req.body;
            if (!clave || valor === undefined || !tipo) {
                res.status(400).json({ message: 'Faltan campos: clave, valor, tipo' });
                return;
            }
            const config = await ConfiguracionService.create({ clave, valor: String(valor), tipo, categoria: categoria ?? 'general', descripcion });
            res.status(201).json({ message: 'Configuración creada', config });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    static delete = async (req: Request, res: Response) => {
        try {
            await ConfiguracionService.delete(req.params.clave);
            res.json({ message: 'Configuración eliminada' });
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    static upsert = async (req: Request, res: Response) => {
        try {
            const { clave } = req.params;
            const { valor } = req.body;
            if (valor === undefined) res.status(400).json({ message: 'Falta el campo valor' });
            const config = await ConfiguracionService.upsert(clave, String(valor));
            res.json({ message: 'Configuración actualizada', config });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}
