import { Router } from "express";
import { RolController } from "../../controllers/Usuarios/RolController";
const router = Router()

router.get('/', RolController.getAllRol)
router.get('/:id_rol', RolController.getRolByID)
router.post('/', RolController.crearRol)
export default router;