import { Router } from 'express';
import { Cat_Periodicidad_PagoController } from '../controllers/Cat_Periodicidad_PagoController';

const router = Router();

router.get('/', Cat_Periodicidad_PagoController.getAll);
router.get('/:id', Cat_Periodicidad_PagoController.getById);
router.post('/', Cat_Periodicidad_PagoController.create);
router.put('/:id', Cat_Periodicidad_PagoController.update);

export default router;
