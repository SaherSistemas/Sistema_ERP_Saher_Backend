import { Router } from 'express';
import { UnidadMedidaController } from '../controllers/UnidadMedidaController';

const router = Router();

router.post('/', UnidadMedidaController.create);
router.get('/', UnidadMedidaController.getAll);
router.get('/prueba', UnidadMedidaController.getPrueba);
router.get('/:id_medida', UnidadMedidaController.getByID);
router.put('/:id_medida', UnidadMedidaController.actualizarByID);
export default router;
