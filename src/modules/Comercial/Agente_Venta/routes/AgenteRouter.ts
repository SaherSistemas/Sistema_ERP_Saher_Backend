import { Router } from 'express';
import { AgenteController } from '../controllers/AgenteController';
import { ReasignacionCarteraController } from '../controllers/ReasignacionCarteraController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();
router.get('/', AgenteController.getAllAgentes);

// Reasignar la cartera de un agente que se da de baja (solo administradores)
router.get('/:id_agente/cartera', authMiddleware, ReasignacionCarteraController.cartera);
router.post('/:id_agente/reasignar-cartera', authMiddleware, ReasignacionCarteraController.reasignar);

router.get('/:id_agente', AgenteController.getAgenteByID);
router.post('/', AgenteController.createAgente);
router.put('/:id_agente', AgenteController.updateAgente);
export default router;
