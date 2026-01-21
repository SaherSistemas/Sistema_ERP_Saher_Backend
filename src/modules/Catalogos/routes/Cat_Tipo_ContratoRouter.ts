import { Router } from 'express';
import { Cat_Tipo_ContratoController } from '../controllers/Cat_Tipo_ContratoController';

const router = Router();

router.get('/', Cat_Tipo_ContratoController.getAll);
router.get('/:id', Cat_Tipo_ContratoController.getById);
router.post('/', Cat_Tipo_ContratoController.create);
router.put('/:id', Cat_Tipo_ContratoController.update);

export default router;
