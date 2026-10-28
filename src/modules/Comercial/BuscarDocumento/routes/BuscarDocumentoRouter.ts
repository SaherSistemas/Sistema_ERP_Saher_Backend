import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../../../../middleware/auth';
import { BuscarDocumentoService } from '../services/BuscarDocumento.service';

const router = Router();

const falla = (res: Response, e: any, donde: string) => {
    console.error(`[BuscarDocumento.${donde}]`, e);
    res.status(e?.status ?? 500).json({ message: e?.message ?? 'No se pudo completar la consulta.' });
};

// GET /comercial/buscar-documento?q=  → pedidos (con sus facturas) que coinciden por folio o cliente
router.get('/', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try { res.status(200).json(await BuscarDocumentoService.buscar(req.user?.id_referencia_persona, String(req.query.q ?? ''))); } catch (e) { falla(res, e, 'buscar'); }
});

// GET /comercial/buscar-documento/pedido/:id  → artículos del pedido (pedido, surtido, negado)
router.get('/pedido/:id', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try { res.status(200).json(await BuscarDocumentoService.detalle(req.user?.id_referencia_persona, req.params.id)); } catch (e) { falla(res, e, 'detalle'); }
});

// GET /comercial/buscar-documento/factura/:id/pdf
router.get('/factura/:id/pdf', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try {
        const { nombre, buffer } = await BuscarDocumentoService.pdf(req.user?.id_referencia_persona, req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
        res.status(200).send(buffer);
    } catch (e) { falla(res, e, 'pdf'); }
});

// GET /comercial/buscar-documento/factura/:id/xml
router.get('/factura/:id/xml', authMiddleware, async (req: AuthedRequest, res: Response) => {
    try {
        const { nombre, buffer } = await BuscarDocumentoService.xml(req.user?.id_referencia_persona, req.params.id);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
        res.status(200).send(buffer);
    } catch (e) { falla(res, e, 'xml'); }
});

export default router;
