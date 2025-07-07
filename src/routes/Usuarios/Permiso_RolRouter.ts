import { Router } from "express";
import { PermisoRolController } from "../../controllers/Usuarios/Permiso_RolController";

const router = Router()

router.get('/', PermisoRolController.getAll)
router.get('/:id_permiso_rol', PermisoRolController.getByID)
router.post('/', PermisoRolController.crear)
router.put('/:id_permiso_rol', PermisoRolController.update)
export default router;