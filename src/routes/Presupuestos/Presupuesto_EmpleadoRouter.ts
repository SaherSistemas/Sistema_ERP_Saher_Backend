import { Router } from "express";
import { Presupuesto_EmpleadoController } from "../../controllers/Presupuestos/Presupuesto_EmpleadoController";


const router = Router();

router.get('/', Presupuesto_EmpleadoController.getAll);
router.post('/', Presupuesto_EmpleadoController.create);
router.get("/presupuesto/:id_presupuesto", Presupuesto_EmpleadoController.getByPresupuesto);
router.get("/noAsignados/:id_empre/:id_presupuesto", Presupuesto_EmpleadoController.getEmpleadosNoAsignados);
router.get("/perfil/:id_empleado/empresa/:id_empre", Presupuesto_EmpleadoController.getPerfilByEmpleadoEmpresa);
router.get("/historial/:id_empleado", Presupuesto_EmpleadoController.getHistorialByEmpleado);
router.put('/:id', Presupuesto_EmpleadoController.update);
router.delete("/:id", Presupuesto_EmpleadoController.delete);
router.get('/:id', Presupuesto_EmpleadoController.getByID);


export default router;
