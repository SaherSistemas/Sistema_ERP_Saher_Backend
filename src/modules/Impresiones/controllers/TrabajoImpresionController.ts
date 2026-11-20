import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import Trabajo_Impresion from '../model/Trabajo_Impresion';
import Impresora from '../model/Impresora';
import { AuthedRequest } from '../../../middleware/auth';
import { TrabajoImpresionService } from '../services/TrabajoImpresion.service';
import fs from 'fs';
import path from 'path';

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

    // GET /impresiones/trabajo/:id/documento → el PDF que se generó para ese trabajo (para verlo sin imprimirlo).
    // La ruta sale del propio trabajo (la escribió el servidor al crearlo), nunca de lo que mande el navegador.
    static documento = async (req: Request, res: Response) => {
        try {
            const trabajo = await Trabajo_Impresion.findByPk(req.params.id);
            if (!trabajo) { res.status(404).json({ message: 'Trabajo no encontrado.' }); return; }
            const p: any = trabajo.payload;
            if (!p || p.tipo !== 'pdf' || !p.ruta_archivo) {
                res.status(404).json({ message: 'Este trabajo no genera un archivo PDF (se manda directo a la impresora).' });
                return;
            }
            const original = String(p.ruta_archivo);
            let ruta = original;
            // La ruta pudo guardarse como la ve el agente de impresión (carpeta de red): se regresa a la ruta local del servidor
            const guardar = process.env.RUTA_PDFS_GUARDAR, agente = process.env.RUTA_PDFS_AGENTE;
            if (guardar && agente && ruta.startsWith(agente)) ruta = guardar + ruta.slice(agente.length);
            // Facturas: el PDF puede estar guardado como una dirección web
            if (/^https?:\/\//i.test(ruta)) { res.status(200).json({ url: ruta }); return; }

            // Se prueba la ruta local y, si no está ahí, la original (por si el servidor sí alcanza la carpeta de red)
            const absoluta = [ruta, original].map(r => path.resolve(r)).find(r => fs.existsSync(r) && fs.statSync(r).isFile()) ?? path.resolve(ruta);
            if (path.extname(absoluta).toLowerCase() !== '.pdf') { res.status(400).json({ message: 'El archivo del trabajo no es un PDF.' }); return; }
            if (!fs.existsSync(absoluta) || !fs.statSync(absoluta).isFile()) {
                res.status(404).json({ message: 'El archivo ya no está en el servidor (se pudo haber limpiado la carpeta de PDFs).' });
                return;
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(absoluta)}"`);
            fs.createReadStream(absoluta).pipe(res);
        } catch (err: any) {
            console.error('[documento trabajo impresion]', err?.message ?? err);
            res.status(500).json({ message: 'No se pudo abrir el documento.' });
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
