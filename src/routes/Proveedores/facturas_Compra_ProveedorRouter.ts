import { Router } from "express";
import { Factura_Compra_ProveedorController } from "../../controllers/Proveedor/Factura_Compra_ProveedorController";
const router = Router()

router.get('/', Factura_Compra_ProveedorController.getAllFacturas)
router.get('/:id_comp', Factura_Compra_ProveedorController.getByIDComp)
router.post('/guardarFacturaEIniciarCaptura', Factura_Compra_ProveedorController.guardarFacturaEIniciarCapturaLotes)
export default router;