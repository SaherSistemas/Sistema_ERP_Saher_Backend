import { Router } from "express";
import { RolController } from "../controllers/RolController";
const router = Router()

router.get('/', RolController.getAllRol)
router.get('/:id_rol', RolController.getRolByID)
router.post('/', RolController.crearRol)
router.put('/:id_rol', RolController.updateRol)
router.delete('/:id_rol', RolController.deleteRol)
export default router;