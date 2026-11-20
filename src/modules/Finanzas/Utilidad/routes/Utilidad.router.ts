import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { UtilidadController } from '../controllers/Utilidad.controller';

const router = Router();

router.get('/resumen', authMiddleware, UtilidadController.resumen);
router.get('/detalle', authMiddleware, UtilidadController.detalle);
router.get('/pedido/:id_pedido', authMiddleware, UtilidadController.pedido);
router.get('/anual', authMiddleware, UtilidadController.anual);
router.post('/gastos', authMiddleware, UtilidadController.crearGasto);
router.post('/gastos/copiar', authMiddleware, UtilidadController.copiarGastos);
router.put('/gastos/:id', authMiddleware, UtilidadController.actualizarGasto);
router.delete('/gastos/:id', authMiddleware, UtilidadController.eliminarGasto);

export default router;
