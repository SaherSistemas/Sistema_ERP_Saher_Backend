import { Router } from 'express';
import { CatFormaPagoController } from '../controllers/Cat_Forma_De_PagoController';

const router = Router();

router.get('/', CatFormaPagoController.getAll);
router.get('/:id', CatFormaPagoController.getById);
router.post('/', CatFormaPagoController.create);
router.put('/:id', CatFormaPagoController.update);
router.delete('/:id', CatFormaPagoController.delete);

export default router;
