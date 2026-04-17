import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

// POST /api/facturas/generar-txt/:id_pedido_alm
router.post('/generar-txt/:id_pedido_alm', authMiddleware, FacturacionController.generarTxt);

export default router;
