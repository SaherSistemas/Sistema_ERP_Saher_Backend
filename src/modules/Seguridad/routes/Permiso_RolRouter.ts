import { Router } from "express";
import { PermisoRolController } from "../controllers/Permiso_RolController";

const router = Router()

router.get('/', PermisoRolController.getAll)
router.get('/:id_rol_permiso', PermisoRolController.getByID)

router.get('/rol_permiso/:id_permiso', PermisoRolController.getAllRolbyPermiso);

router.post('/', PermisoRolController.crear)
router.put('/:id_rol_permiso', PermisoRolController.update)
export default router;