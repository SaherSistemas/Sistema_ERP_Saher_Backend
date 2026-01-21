import { Router } from "express";
import { PermisoController } from "../controllers/PermisoController";

const router = Router()

router.get('/', PermisoController.getAll)
router.get('/:id_permiso', PermisoController.getByID)
router.post('/', PermisoController.create)
router.put('/:id_permiso', PermisoController.update)
export default router;