import { Router } from 'express';
import { PermisoUsuarioController } from '../controllers/Permiso_UsuarioController';

const router = Router();

router.get('/by-user/:id_user', PermisoUsuarioController.getByUser);
router.post('/bulk/:id_user', PermisoUsuarioController.bulkSet);

export default router;
