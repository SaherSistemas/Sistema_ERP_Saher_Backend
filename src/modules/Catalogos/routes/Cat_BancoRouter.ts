import { Router } from 'express';
import { Cat_BancosController } from '../controllers/Cat_BancosController';

const router = Router();

router.get('/', Cat_BancosController.getAll);
router.get('/:id', Cat_BancosController.getById);
router.post('/', Cat_BancosController.create);
router.put('/:id', Cat_BancosController.update);

export default router;
