import { Router } from 'express';
import { CatalogosAdminController } from '../controllers/CatalogosAdminController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

// Sin el token decodificado el controlador no puede saber la prioridad del usuario
router.use(authMiddleware);

router.get('/', CatalogosAdminController.catalogos);
router.get('/:tabla', CatalogosAdminController.listar);
router.post('/:tabla/actualizar', CatalogosAdminController.actualizar);
router.post('/:tabla/eliminar', CatalogosAdminController.eliminar);
router.post('/:tabla', CatalogosAdminController.crear);

export default router;
