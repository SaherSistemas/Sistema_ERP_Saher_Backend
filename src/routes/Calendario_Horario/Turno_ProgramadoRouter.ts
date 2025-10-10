import { Router } from "express";
import { Turno_ProgramadoController } from "../../controllers/Calendario_Horario/Turno_ProgramadoController";

const router = Router();

router.get('/:id_periodo', Turno_ProgramadoController.getTurnosPorPeriodo);
router.get('/:id_turno', Turno_ProgramadoController.getById);
router.get('/', Turno_ProgramadoController.getAll);
router.post('/', Turno_ProgramadoController.create);
router.put('/:id_turno', Turno_ProgramadoController.update);
router.delete('/:id_turno', Turno_ProgramadoController.delete);


export default router;