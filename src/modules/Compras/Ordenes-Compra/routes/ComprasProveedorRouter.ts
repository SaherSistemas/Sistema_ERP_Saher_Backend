import { Router } from "express"
import { CompraProveedorController } from "../controllers/CompraProveedorController"
import { authMiddleware } from "../../../../middleware/auth"
const router = Router()

router.post('/', authMiddleware, CompraProveedorController.createCompraProveedor)
router.get('/captura/:id_empresa', authMiddleware, CompraProveedorController.lineasEnCaptura) //LÍNEAS CAPTURADAS EN LA COMPRA ABIERTA (refresco entre capturistas)

router.get('/compraProveedorPorGeneral/:id_compra_general', CompraProveedorController.comprasProveedorPorIDCompraGeneral) //TODAS LAS COMPRASPROVEEDOR POR UN ID COMPRA GENERAL
router.get('/todasPorProveedor/:id_empresa', CompraProveedorController.getTodasOrdenesPorProveedor) //VISTA PLANA: TODAS LAS ÓRDENES DEL RANGO, AGRUPADAS POR PROVEEDOR
router.get('/compraProveedorDevolucionesPendientes', CompraProveedorController.CompraDevolucionPendiente)
router.get('/detalleOrden/:id_comp', CompraProveedorController.detalleOrden) //VISTA PREVIA DE LA ORDEN (NO CAMBIA ESTADO)
router.get('/articulosGenerarPDF/:id_comp', CompraProveedorController.generarPDFListado) //GENERA EL PDF Y MARCA COMO ENVIADA

router.get('/nombreArchivoPDF/:id_comp', CompraProveedorController.nombreArchivoPDF)


router.post('/finalizar_captura_facturas_de_compras', CompraProveedorController.finalizarCapturaFacturasDeCompras)  //FINALIZAR CAPTURA + NEGADOS


router.get('/compraProveedorPorRecibir/:id_empresa_sucursal', CompraProveedorController.getAllCompras_ProveedorParaRecibir)

router.patch('/marcarRecibida/:id_comp', CompraProveedorController.marcarCompraProveedorComoRecibida)

router.patch('/reabrirParaNuevaFactura/:id_comp', authMiddleware, CompraProveedorController.reabrirParaNuevaFactura)

router.patch('/iniciarChecado/:id_comp', CompraProveedorController.iniciarChecado)

router.patch('/iniciarAcomodo/:id_comp', CompraProveedorController.iniciarAcomodo)

router.patch('/finalizarAcomodo/:id_comp', CompraProveedorController.finalizarAcomodo)
export default router