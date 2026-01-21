import { Router } from 'express';
import { Cat_Tipo_JornadaController } from '../controllers/Cat_Tipo_JornadaController';

const router = Router();

router.get('/', Cat_Tipo_JornadaController.getAll);
router.get('/:id', Cat_Tipo_JornadaController.getById);
router.post('/', Cat_Tipo_JornadaController.create);
router.put('/:id', Cat_Tipo_JornadaController.update);

export default router;
