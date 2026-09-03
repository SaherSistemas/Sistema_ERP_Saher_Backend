import { Router } from 'express';
import { ConfiguracionController } from '../controllers/Configuracion.controller';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

router.get('/',               authMiddleware, ConfiguracionController.getAll);
router.post('/',              authMiddleware, ConfiguracionController.create);
router.get('/:clave',         authMiddleware, ConfiguracionController.getByClave);
router.put('/:clave',         authMiddleware, ConfiguracionController.upsert);
router.delete('/:clave',      authMiddleware, ConfiguracionController.delete);

export default router;
