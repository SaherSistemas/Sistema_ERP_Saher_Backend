import { Router } from 'express';
import { KardexController } from '../controllers/KardexController';

const router = Router();

router.get('/movimientos', KardexController.obtenerMovimientos);
router.get('/existencias', KardexController.obtenerExistencias);

router.get('/proyecciones', KardexController.obtenerProyecciones);
router.post('/', KardexController.crearMovimiento);

export default router;
