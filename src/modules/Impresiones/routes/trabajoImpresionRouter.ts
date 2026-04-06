import { Router } from 'express';
import { TrabajoImpresionController } from '../controllers/TrabajoImpresionController';

const router = Router();

router.get('/stats', TrabajoImpresionController.stats);
router.post('/:id_pedido_alm/:tipo_documento', TrabajoImpresionController.create);
router.post('/:id/reintentar', TrabajoImpresionController.reintentar);
router.post('/:id/cancelar', TrabajoImpresionController.cancelar);

export default router;
