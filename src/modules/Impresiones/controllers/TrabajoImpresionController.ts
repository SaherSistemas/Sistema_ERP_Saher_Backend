import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import Trabajo_Impresion from '../model/Trabajo_Impresion';
import Impresora from '../model/Impresora';
import { AuthedRequest } from '../../../middleware/auth';
import { TrabajoImpresionService } from '../services/TrabajoImpresion.service';

export class TrabajoImpresionController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const { estado, tipo_documento, limit = 50, offset = 0 } = req.query;
            const where: any = {};
            if (estado) where.estado = estado;
            if (tipo_documento) where.tipo_documento = tipo_documento;

            const trabajos = await Trabajo_Impresion.findAndCountAll({
                where,
                include: [{ model: Impresora, as: 'impresora' }],
                order: [['fecha_solicitud', 'DESC']],
                limit: Number(limit),
                offset: Number(offset),
            });
            res.json(trabajos);
        } catch (err) {
            res.status(500).json({ error: 'Error al obtener trabajos' });
        }
    };

    // Crea un nuevo trabajo en cola (estado PENDIENTE)
    static create = async (req: AuthedRequest, res: Response) => {
        const { id_pedido_alm, tipo_documento } = req.params;
        const { estacion, ...extraBody } = req.body;
        const id_empresa = req.user.id_empresa;

        try {
            const trabajo = await TrabajoImpresionService.createTrabajoImpresion(id_pedido_alm, tipo_documento, estacion, id_empresa, extraBody);
            res.status(201).json(trabajo);
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ error: err?.message ?? 'Error al crear trabajo de impresión' });
        }
    };

    // Reencola un trabajo en ERROR para reintentarlo
    static reintentar = async (req: Request, res: Response) => {
        try {
            const trabajo = await Trabajo_Impresion.findByPk(req.params.id);
            if (!trabajo) res.status(404).json({ error: 'Trabajo no encontrado' });
            if (!['ERROR', 'CANCELADO'].includes(trabajo.estado)) {
                res.status(409).json({ error: `No se puede reintentar un trabajo en estado ${trabajo.estado}` });
            }
            await trabajo.update({
                estado: 'PENDIENTE',
                intentos: 0,
                ultimo_error: null,
                es_reimpresion: true,
            });
            res.json({ mensaje: 'Trabajo reencolado', trabajo });
        } catch (err) {
            res.status(500).json({ error: 'Error al reintentar trabajo' });
        }
    };

    // Cancela un trabajo PENDIENTE
    static cancelar = async (req: Request, res: Response) => {
        try {
            const trabajo = await Trabajo_Impresion.findByPk(req.params.id);
            if (!trabajo) res.status(404).json({ error: 'Trabajo no encontrado' });
            if (trabajo.estado !== 'PENDIENTE') {
                res.status(409).json({ error: `No se puede cancelar un trabajo en estado ${trabajo.estado}` });
            }
            await trabajo.update({ estado: 'CANCELADO' });
            res.json({ mensaje: 'Trabajo cancelado' });
        } catch (err) {
            res.status(500).json({ error: 'Error al cancelar trabajo' });
        }
    };

    // Estadísticas rápidas de la cola
    static stats = async (_req: Request, res: Response) => {
        try {
            const estados = ['PENDIENTE', 'EN_PROCESO', 'IMPRESO', 'ERROR', 'CANCELADO'];
            const counts: Record<string, number> = {};

            for (const estado of estados) {
                counts[estado] = await Trabajo_Impresion.count({ where: { estado } });
            }

            res.json(counts);
        } catch (err) {
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    };
}
