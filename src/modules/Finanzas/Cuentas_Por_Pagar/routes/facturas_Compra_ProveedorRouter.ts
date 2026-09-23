import { Router } from "express";
import { Factura_Compra_ProveedorController } from "../controllers/Factura_Compra_ProveedorController";
import { Detalle_Factura_Compra_ProveedorController } from "../controllers/Detalle_Factura_Compra_ProveedorController";
import { authMiddleware } from "../../../../middleware/auth";
const router = Router()

// - Obtener las facturas que estan por recibirse
router.get('/porRecibir', Factura_Compra_ProveedorController.getAllConFiltroDeEstado)
// - Obtener los detalles de una factura por su id para poder checarla
router.get('/detallesFactura/:id_factura_proveedor', Factura_Compra_ProveedorController.getDetallesFacturaPorIdFacturaProveedor)
// - Obtener todas las facturas de una compra proveedor
router.get('/porCompra/:id_comp', Factura_Compra_ProveedorController.getFacturasPorCompraProveedor)
// - Obtener detalle completo de una factura (artículos, cantidades, empleados)
router.get('/facturaCompleta/:id_factura_proveedor', Factura_Compra_ProveedorController.getFacturaCompleta)
// Paso 1: Definir la ruta para guardar la factura e iniciar la captura de lotes
router.post('/guardarFacturaEIniciarCaptura', Factura_Compra_ProveedorController.guardarFacturaEIniciarCapturaLotes)
// Paso 2: Definir la ruta para guardar la captura completa de la factura
router.post('/guardarCapturaCompleta', authMiddleware, Factura_Compra_ProveedorController.guardarCapturaCompleta)
//Paso 3: Definir la ruta para checar la mercancia que viene en la factura 
//router.post('/checarMercanciaFactura', Factura_Compra_ProveedorController.checarMercanciaFactura)

// Facturas pendientes de guardar
router.get('/enCaptura/:id_comp', Factura_Compra_ProveedorController.getFacturaEnCaptura);


router.delete('/detalles/:id_factura_proveedor_detalle', Detalle_Factura_Compra_ProveedorController.eliminarDetalle);
router.post('/:id_factura/guardarLinea', Detalle_Factura_Compra_ProveedorController.guardarLineaFactura);
router.get('/:id_factura/lineas', Detalle_Factura_Compra_ProveedorController.getLineasFactura);

//! CHEQUEO DE FACTURAS PROVEEDOR
// Modificamos los lotes que se registraron en la factura, para marcar los que ya se checaron y agregar a detalles Recibidos y lotes recibidos
router.patch('/detalles/lotes', authMiddleware, Detalle_Factura_Compra_ProveedorController.modificarLotesYDetallesRecibidosFacturaProveedor);

// Cambia el artículo de un renglón (se recibió otro producto del catálogo, no el solicitado/facturado)
router.patch('/detalles/:id_factura_proveedor_detalle/articulo', authMiddleware, Detalle_Factura_Compra_ProveedorController.cambiarArticulo);

router.patch('/finalizarChequeoFactura/:id_factura_proveedor', authMiddleware, Factura_Compra_ProveedorController.finalizarChequeoFacturaProveedor);
router.patch('/:id_factura_proveedor', Factura_Compra_ProveedorController.actualizarEncabezado);
router.get('/:id_comp', Factura_Compra_ProveedorController.getByIDComp);
export default router;