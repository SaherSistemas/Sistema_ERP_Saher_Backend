import { Router } from "express";
import { Presupuesto_EmpleadoController } from "../../controllers/Presupuestos/Presupuesto_EmpleadoController";


const router = Router();

router.get('/', Presupuesto_EmpleadoController.getAll);
router.post('/', Presupuesto_EmpleadoController.create);
router.put('/:id', Presupuesto_EmpleadoController.update);
router.get('/:id', Presupuesto_EmpleadoController.getByID);
router.get("/presupuesto/:id_presupuesto", Presupuesto_EmpleadoController.getByPresupuesto);
router.delete("/:id", Presupuesto_EmpleadoController.delete);
router.get("/noAsignados/:id_empre/:id_presupuesto", Presupuesto_EmpleadoController.getEmpleadosNoAsignados);


export default router;
