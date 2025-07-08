import { Router } from "express";
import { PermisoController } from "../../controllers/Usuarios/PermisoController";

const router = Router()

router.get('/', PermisoController.getAll)
router.get('/:id_permiso', PermisoController.getByID)
router.post('/', PermisoController.crear)
router.put('/:id_permiso', PermisoController.update)
export default router;