import { Router } from 'express';
import { AgenteCaducidadController } from '../controllers/AgenteCaducidadController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

router.get('/:id_agente', AgenteCaducidadController.get);
router.put('/:id_agente', authMiddleware, AgenteCaducidadController.guardar);

export default router;
