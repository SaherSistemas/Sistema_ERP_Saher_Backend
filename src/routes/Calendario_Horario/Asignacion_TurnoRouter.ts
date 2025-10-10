import { Router } from "express";
import { Asignacion_TurnoController } from "../../controllers/Calendario_Horario/Asignacion_TurnoController";

const router = Router();

router.get('/:id_empleado', Asignacion_TurnoController.TurnosAsignadosEmpleado);
router.get('/:id_turno', Asignacion_TurnoController.getByTurno);
router.get('/id/:id_asignacion', Asignacion_TurnoController.getByID);
router.get('/', Asignacion_TurnoController.getAll);
router.post('/', Asignacion_TurnoController.create);
router.put('/:id_turno', Asignacion_TurnoController.update);
router.delete('/:id_turno', Asignacion_TurnoController.delete);


export default router;