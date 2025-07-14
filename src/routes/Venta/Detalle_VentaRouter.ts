import { Router } from "express";
import { DetalleVentaController } from "../../controllers/Venta/Detalle_VentaController"

const router = Router();

router.get('/', DetalleVentaController.getAll);
router.get('/:id', DetalleVentaController.getByID);
router.post('/', DetalleVentaController.create);
router.put('/id_detalle_venta/:id', DetalleVentaController.update);


export default router;
