import type { Request, Response } from 'express';
import Impresora from '../model/Impresora';
;

export class ImpresoraController {

    static getAll = async (_req: Request, res: Response) => {
        try {
            const impresoras = await Impresora.findAll({ order: [['nombre_impresora', 'ASC']] });
            res.json(impresoras);
        } catch (err) {
            res.status(500).json({ error: 'Error al obtener impresoras' });
        }
    };

    static getById = async (req: Request, res: Response) => {
        try {
            const impresora = await Impresora.findByPk(req.params.id);
            if (!impresora) res.status(404).json({ error: 'Impresora no encontrada' });
            res.json(impresora);
        } catch (err) {
            res.status(500).json({ error: 'Error al obtener impresora' });
        }
    };

    static create = async (req: Request, res: Response) => {
        try {
            const impresora = await Impresora.create(req.body);
            res.status(201).json(impresora);
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Error al crear impresora' });
        }
    };

    static update = async (req: Request, res: Response) => {
        try {
            const impresora = await Impresora.findByPk(req.params.id);
            if (!impresora) res.status(404).json({ error: 'Impresora no encontrada' });
            await impresora.update(req.body);
            res.json(impresora);
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Error al actualizar impresora' });
        }
    };

    static toggleActiva = async (req: Request, res: Response) => {
        try {
            const impresora = await Impresora.findByPk(req.params.id);
            if (!impresora) res.status(404).json({ error: 'Impresora no encontrada' });
            await impresora.update({ activa: !impresora.activa });
            res.json({ activa: impresora.activa });
        } catch (err) {
            res.status(500).json({ error: 'Error al cambiar estado de impresora' });
        }
    };

    static delete = async (req: Request, res: Response) => {
        try {
            const impresora = await Impresora.findByPk(req.params.id);
            if (!impresora) res.status(404).json({ error: 'Impresora no encontrada' });
            await impresora.destroy();
            res.json({ mensaje: 'Impresora eliminada' });
        } catch (err) {
            res.status(500).json({ error: 'Error al eliminar impresora' });
        }
    };
}
