import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../../../../middleware/auth';
import { ComprasVencimientoService, vencerOrdenesNoRecibidas, ID_PLAZO_GENERAL } from '../services/ComprasVencimiento.service';

const router = Router();
router.use(authMiddleware);

const responder = (res: Response, error: any, mensajeBase: string) => {
    if (!error?.status) console.error('[ComprasVencidas]', error);
    res.status(error?.status ?? 500).json({ message: error?.message ?? mensajeBase });
};

// GET /compras_vencidas → órdenes Vencidas de la empresa del usuario
router.get('/', async (req: AuthedRequest, res: Response) => {
    try {
        res.json(await ComprasVencimientoService.listarVencidas(String(req.user?.id_empresa ?? '')));
    } catch (e) { responder(res, e, 'No se pudieron consultar las órdenes vencidas.'); }
});

// POST /compras_vencidas/ejecutar → revisa ahora (sin esperar a la revisión automática)
router.post('/ejecutar', async (_req: AuthedRequest, res: Response) => {
    try {
        res.json(await vencerOrdenesNoRecibidas());
    } catch (e) { responder(res, e, 'No se pudo revisar las órdenes.'); }
});

// GET /compras_vencidas/dias-entrega → plazo general y el de cada proveedor
router.get('/dias-entrega', async (_req: AuthedRequest, res: Response) => {
    try {
        res.json({ id_general: ID_PLAZO_GENERAL, ...(await ComprasVencimientoService.getDiasEntrega()) });
    } catch (e) { responder(res, e, 'No se pudieron consultar los plazos.'); }
});

// PUT /compras_vencidas/dias-entrega/:id_prove  { dias: number | null }
router.put('/dias-entrega/:id_prove', async (req: AuthedRequest, res: Response) => {
    try {
        const dias = req.body?.dias === null || req.body?.dias === '' || req.body?.dias === undefined ? null : Number(req.body.dias);
        res.json(await ComprasVencimientoService.setDiasEntrega(req.params.id_prove, dias));
    } catch (e) { responder(res, e, 'No se pudo guardar el plazo.'); }
});

// POST /compras_vencidas/:id_comp/reactivar
router.post('/:id_comp/reactivar', async (req: AuthedRequest, res: Response) => {
    try {
        res.json(await ComprasVencimientoService.reactivar(req.params.id_comp));
    } catch (e) { responder(res, e, 'No se pudo reactivar la orden.'); }
});

export default router;
