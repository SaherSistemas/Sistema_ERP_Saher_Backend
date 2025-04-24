import { Router } from "express";
import { EmpleadoController } from "../../controllers/Usuarios/EmpleadoController";

const router = Router();
router.get('/', EmpleadoController.getAllEmpleados)
router.post('/', EmpleadoController.createEmpleado)
export default router;