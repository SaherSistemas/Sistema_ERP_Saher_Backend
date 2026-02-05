import { Router } from "express";
import { Factura_Compra_ProveedorController } from "../controllers/Factura_Compra_ProveedorController";
import { Detalle_Factura_Compra_ProveedorController } from "../controllers/Detalle_Factura_Compra_ProveedorController";
import { authMiddleware } from "../../../../middleware/auth";
const router = Router()

// - Obtener las facturas que estan por recibirse
router.get('/porRecibir', Factura_Compra_ProveedorController.getAllConFiltroDeEstado)
// - Obtener los detalles de una factura por su id para poder checarla
router.get('/detallesFactura/:id_factura_proveedor', Factura_Compra_ProveedorController.getDetallesFacturaPorIdFacturaProveedor)
router.get('/:id_comp', Factura_Compra_ProveedorController.getByIDComp)

// Paso 1: Definir la ruta para guardar la factura e iniciar la captura de lotes
router.post('/guardarFacturaEIniciarCaptura', Factura_Compra_ProveedorController.guardarFacturaEIniciarCapturaLotes)
// Paso 2: Definir la ruta para guardar la captura completa de la factura
router.post('/guardarCapturaCompleta', Factura_Compra_ProveedorController.guardarCapturaCompleta)
//Paso 3: Definir la ruta para checar la mercancia que viene en la factura 
//router.post('/checarMercanciaFactura', Factura_Compra_ProveedorController.checarMercanciaFactura)


//! CHEQUEO DE FACTURAS PROVEEDOR
// Modificamos los lotes que se registraron en la factura, para marcar los que ya se checaron y agregar a detalles Recibidos y lotes recibidos 
router.patch('/detalles/lotes', authMiddleware, Detalle_Factura_Compra_ProveedorController.modificarLotesYDetallesRecibidosFacturaProveedor);

router.patch('/finalizarChequeoFactura/:id_factura_proveedor', authMiddleware, Factura_Compra_ProveedorController.finalizarChequeoFacturaProveedor);
export default router;