import { Router } from "express";
import { EmpleadoController } from "../../controllers/Usuarios/EmpleadoController";

const router = Router();

router.post('/', EmpleadoController.createEmpleado);
router.get('/', EmpleadoController.getAll)
export default router;