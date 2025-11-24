import { Router } from "express";
import { MovimientoCajaController } from "../../controllers/Caja/Movimiento_CajaController";
const router = Router();

router.get('/:id_movimiento', MovimientoCajaController.getByID);
router.get('/', MovimientoCajaController.getAll);
router.get('/caja/:id_caja', MovimientoCajaController.getAllByCaja);
router.get('/corte/:id_corte', MovimientoCajaController.getAllByCorte);
router.post('/', MovimientoCajaController.create);
router.put('/:id_movimiento', MovimientoCajaController.update);

export default router;