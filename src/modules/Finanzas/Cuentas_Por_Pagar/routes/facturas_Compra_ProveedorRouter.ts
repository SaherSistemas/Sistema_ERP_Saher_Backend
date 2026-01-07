import { Router } from "express";
import { Factura_Compra_ProveedorController } from "../controllers/Factura_Compra_ProveedorController";
const router = Router()

router.get('/porRecibir', Factura_Compra_ProveedorController.getAllFacturas)
router.get('/:id_comp', Factura_Compra_ProveedorController.getByIDComp)
router.post('/guardarFacturaEIniciarCaptura', Factura_Compra_ProveedorController.guardarFacturaEIniciarCapturaLotes)



router.post('/guardarArticulosFactura', Factura_Compra_ProveedorController.guardarArticulosFactura)
router.post('/guardarCapturaCompleta', Factura_Compra_ProveedorController.guardarCapturaCompleta)

export default router;