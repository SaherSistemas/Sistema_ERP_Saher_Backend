import { Router, Request, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../../../../middleware/auth';
import { ListaPreciosDescargaService } from '../services/ListaPreciosDescarga.service';

const router = Router();

const nombreArchivo = (nombre: string, ext: string) =>
    `Lista de precios ${nombre}`.replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, '').trim().replace(/\s+/g, '_') + `.${ext}`;

const falla = (res: Response, e: any, donde: string) => {
    console.error(`[ListaPreciosDescarga.${donde}]`, e);
    res.status(e?.status ?? 500).json({ message: e?.message ?? 'No se pudo generar la lista de precios.' });
};

// GET /comercial/lista-precios → listas disponibles (para un agente: las de sus clientes activos)
router.get('/', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try { res.status(200).json(await ListaPreciosDescargaService.listas(req.user?.id_referencia_persona)); } catch (e) { falla(res, e, 'listas'); }
});

// GET /comercial/lista-precios/:id/pdf
router.get('/:id/pdf', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try {
        const { nombre, buffer } = await ListaPreciosDescargaService.pdf(req.params.id, String(req.user?.id_empresa ?? ''));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo(nombre, 'pdf')}"`);
        res.status(200).send(buffer);
    } catch (e) { falla(res, e, 'pdf'); }
});

// GET /comercial/lista-precios/:id/excel
router.get('/:id/excel', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try {
        const { nombre, buffer } = await ListaPreciosDescargaService.excel(req.params.id, String(req.user?.id_empresa ?? ''));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(nombre, 'xlsx')}"`);
        res.status(200).send(buffer);
    } catch (e) { falla(res, e, 'excel'); }
});

export default router;
