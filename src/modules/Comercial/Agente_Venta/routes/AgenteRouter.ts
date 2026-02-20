import { Router } from 'express';
import { AgenteController } from '../controllers/AgenteController';

const router = Router();
router.get('/', AgenteController.getAllAgentes);
router.get('/:id_agente', AgenteController.getAgenteByID);
router.post('/', AgenteController.createAgente);
router.put('/:id_agente', AgenteController.updateAgente);
export default router;
