import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { UtilidadSucursalesController } from '../controllers/UtilidadSucursales.controller';

const router = Router();

router.get('/resumen', authMiddleware, UtilidadSucursalesController.resumen);
router.get('/detalle', authMiddleware, UtilidadSucursalesController.detalle);
router.get('/tickets', authMiddleware, UtilidadSucursalesController.tickets);
router.get('/ticket/:clave', authMiddleware, UtilidadSucursalesController.ticket);
router.get('/anual', authMiddleware, UtilidadSucursalesController.anual);
router.post('/gastos', authMiddleware, UtilidadSucursalesController.crearGasto);
router.post('/gastos/copiar', authMiddleware, UtilidadSucursalesController.copiarGastos);
router.put('/gastos/:id', authMiddleware, UtilidadSucursalesController.actualizarGasto);
router.delete('/gastos/:id', authMiddleware, UtilidadSucursalesController.eliminarGasto);

export default router;
