import { Router } from "express";
import { Factura_Compra_ProveedorController } from "../controllers/Factura_Compra_ProveedorController";
const router = Router()

router.get('/porRecibir', Factura_Compra_ProveedorController.getAllFacturas)
router.get('/:id_comp', Factura_Compra_ProveedorController.getByIDComp)

// Paso 1: Definir la ruta para guardar la factura e iniciar la captura de lotes
router.post('/guardarFacturaEIniciarCaptura', Factura_Compra_ProveedorController.guardarFacturaEIniciarCapturaLotes)
// Paso 2: Definir la ruta para guardar la captura completa de la factura
router.post('/guardarCapturaCompleta', Factura_Compra_ProveedorController.guardarCapturaCompleta)

export default router;