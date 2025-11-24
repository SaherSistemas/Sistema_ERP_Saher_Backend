import { Router } from 'express';
import { Cat_Metodo_PagoController } from '../../controllers/Catalogos/Cat_Metodo_PagoController';

const router = Router();

router.get('/', Cat_Metodo_PagoController.getAll);
router.get('/:id_metodo_pago', Cat_Metodo_PagoController.getByID);
router.post('/', Cat_Metodo_PagoController.create);

export default router;
