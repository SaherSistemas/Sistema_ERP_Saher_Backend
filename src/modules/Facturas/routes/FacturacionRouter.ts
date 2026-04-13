import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';

const router = Router();

// POST /api/facturacion/:id_pedido_alm/generar-txt
router.post('/:id_pedido_alm/generar-txt', FacturacionController.generarTxt);

export default router;
