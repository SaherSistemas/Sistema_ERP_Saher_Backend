import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { DevolucionProveedorController } from '../controllers/DevolucionProveedorController';

const router = Router();
router.use(authMiddleware);

router.get('/factura/:id_factura/historial', DevolucionProveedorController.historial);
router.get('/factura/:id_factura', DevolucionProveedorController.elegibles);
router.post('/', DevolucionProveedorController.crear);
router.get('/:id/pdf', DevolucionProveedorController.pdf);

export default router;
