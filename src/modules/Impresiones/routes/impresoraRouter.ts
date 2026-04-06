import { Router } from 'express';
import { ImpresoraController } from '../controllers/ImpresoraController';

const router = Router();

router.get('/',            ImpresoraController.getAll);
router.get('/:id',         ImpresoraController.getById);
router.post('/',           ImpresoraController.create);
router.put('/:id',         ImpresoraController.update);
router.patch('/:id/activa', ImpresoraController.toggleActiva);
router.delete('/:id',      ImpresoraController.delete);

export default router;
