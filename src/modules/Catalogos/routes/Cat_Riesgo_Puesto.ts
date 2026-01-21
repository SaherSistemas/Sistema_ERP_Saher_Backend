import { Router } from 'express';
import { Cat_Riesgo_PuestoController } from '../controllers/Cat_Riesgo_PuestoController';

const router = Router();

router.get('/', Cat_Riesgo_PuestoController.getAll);
router.get('/:id', Cat_Riesgo_PuestoController.getById);
router.post('/', Cat_Riesgo_PuestoController.create);
router.put('/:id', Cat_Riesgo_PuestoController.update);

export default router;
