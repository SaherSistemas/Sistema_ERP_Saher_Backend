import { Router } from "express";
import { VentaController } from "../../controllers/Venta/VentaController"

const router = Router();

router.get('/', VentaController.getAll);
router.get('/:id', VentaController.getByID);
router.post('/', VentaController.create);
//router.put('/id_detalle_venta/:id', VentaController.update);


export default router;
