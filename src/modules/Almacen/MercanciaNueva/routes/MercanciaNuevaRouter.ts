import { Router, Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import { MercanciaNuevaService } from '../services/MercanciaNueva.service';

const router = Router();

// GET /almacen/mercancia_nueva?dias=7&q=texto&limite=300&negados=1  (negados=1: solo lo que estaba negado y ya llegó)
// Lo que ya se chequeó en Recibo de mercancía y entró al almacén (para mostrador)
router.get('/', async (req: AuthedRequest, res: Response) => {
    try {
        const id_empresa = String(req.user?.id_empresa || '').trim();
        if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
        const dias = Math.min(90, Math.max(1, Math.floor(Number(req.query.dias) || 7)));
        const limite = Math.min(1000, Math.max(20, Math.floor(Number(req.query.limite) || 300)));
        const q = typeof req.query.q === 'string' ? req.query.q : '';
        const soloNegados = req.query.negados === '1' || req.query.negados === 'true';
        res.status(200).json(await MercanciaNuevaService.getLista(id_empresa, { dias, q, limite, soloNegados }));
    } catch (e: any) {
        console.error('[MercanciaNueva]', e);
        res.status(500).json({ message: e?.message ?? 'Error al consultar la mercancía nueva.' });
    }
});

export default router;
