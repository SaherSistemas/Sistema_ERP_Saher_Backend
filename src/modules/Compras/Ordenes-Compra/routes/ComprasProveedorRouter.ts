import { Router } from "express"
import { CompraProveedorController } from "../controllers/CompraProveedorController"
const router = Router()

router.post('/', CompraProveedorController.createCompraProveedor)

router.get('/compraProveedorPorGeneral/:id_compra_general', CompraProveedorController.comprasProveedorPorIDCompraGeneral) //TODAS LAS COMPRASPROVEEDOR POR UN ID COMPRA GENERAL 
router.get('/compraProveedorDevolucionesPendientes', CompraProveedorController.CompraDevolucionPendiente)
router.get('/articulosGenerarPDF/:id_comp', CompraProveedorController.generarPDFListado)

router.get('/nombreArchivoPDF/:id_comp', CompraProveedorController.nombreArchivoPDF)


router.post('/finalizar_captura_facturas_de_compras', CompraProveedorController.finalizarCapturaFacturasDeCompras)  //FINALIZAR CAPTURA + NEGADOS


router.get('/compraProveedorPorRecibir/:id_empresa_sucursal', CompraProveedorController.getAllCompras_ProveedorParaRecibir)

router.patch('/marcarRecibida/:id_comp', CompraProveedorController.marcarCompraProveedorComoRecibida)

router.patch('/iniciarChecado/:id_comp', CompraProveedorController.iniciarChecado)

router.patch('/iniciarAcomodo/:id_comp', CompraProveedorController.iniciarAcomodo)

router.patch('/finalizarAcomodo/:id_comp', CompraProveedorController.finalizarAcomodo)
export default router