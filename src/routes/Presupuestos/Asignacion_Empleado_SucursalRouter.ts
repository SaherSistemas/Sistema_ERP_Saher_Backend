import { Router } from "express";
import { Asignacion_Empleado_SucursalController } from "../../controllers/Presupuestos/Asignacion_Empleado_SucursalController";


const router = Router();

router.get("/", Asignacion_Empleado_SucursalController.getAll);
router.post("/", Asignacion_Empleado_SucursalController.create);
router.get("/:id", Asignacion_Empleado_SucursalController.getByID);
router.put("/:id", Asignacion_Empleado_SucursalController.update);

export default router;