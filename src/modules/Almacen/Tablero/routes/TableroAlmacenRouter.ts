import { Router } from 'express';
import { TableroAlmacenController } from '../controllers/TableroAlmacenController';

const router = Router();

router.get('/', TableroAlmacenController.getResumen);
router.get('/procesos', TableroAlmacenController.getProcesos);
router.get('/valor-costo', TableroAlmacenController.getValorCosto);
router.get('/dias-inventario', TableroAlmacenController.getDiasInventario);
router.get('/negados', TableroAlmacenController.getNegadosVigentes);
router.get('/caducidades', TableroAlmacenController.getCaducidades);
router.get('/sin-existencia', TableroAlmacenController.getSinExistencia);

export default router;
