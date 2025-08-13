import { Router } from "express";
import { VentaPagoController } from "../../controllers/Venta/Venta_PagoController";
const router = Router();


router.get('/', VentaPagoController.getAll);
router.get('/:id', VentaPagoController.getById);
router.post('/', VentaPagoController.create);


export default router;