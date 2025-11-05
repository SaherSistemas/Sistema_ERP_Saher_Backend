import { Router } from "express";
import { Asignacion_Empleado_SucursalController } from "../../controllers/Presupuestos/Asignacion_Empleado_SucursalController";


const router = Router();

router.get("/", Asignacion_Empleado_SucursalController.getAll);
router.get("/empleado/:id_empleado", Asignacion_Empleado_SucursalController.getAllByEmpleado);
router.get("/resumen/empleados", Asignacion_Empleado_SucursalController.getResumenPorEmpleado);
router.get("/sin-asignacion/:id_empre", Asignacion_Empleado_SucursalController.getEmpleadosSinAsignacionEmpresa);


router.post("/", Asignacion_Empleado_SucursalController.create);
router.get("/:id", Asignacion_Empleado_SucursalController.getByID);
router.put("/:id", Asignacion_Empleado_SucursalController.update);

export default router;