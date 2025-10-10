import { Router } from "express";
import { Periodo_CalendarioController } from "../../controllers/Calendario_Horario/Periodo_CalendarioController"; 
const router = Router();

router.get('/:id_periodo', Periodo_CalendarioController.getByID);
router.post('/duplicar/:id_periodo', Periodo_CalendarioController.duplicarPeriodo);
router.post('/activar/:id_periodo', Periodo_CalendarioController.activarPeriodo);
router.post('/cerrar/:id_periodo', Periodo_CalendarioController.cerrarPeriodo);
router.get('/', Periodo_CalendarioController.getAll);
router.post('/', Periodo_CalendarioController.create);
router.put('/:id_periodo', Periodo_CalendarioController.update);
router.delete('/:id_periodo', Periodo_CalendarioController.delete);

export default router;