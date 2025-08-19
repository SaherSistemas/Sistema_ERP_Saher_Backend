import { Router } from "express";
import { ComprasController } from "../../controllers/Compras/CompraController";
const router = Router();

router.post('/', ComprasController.createCompra)
router.get('/:id_empresa', ComprasController.getAll)
router.get('/enCaptura/:id_empresa', ComprasController.getByEmpresaEnCaptura)
router.get('/compraProveedorPorGeneral/:id_compra_general', ComprasController.comprasProveedorPorIDCompraGeneral)
//router.patch('/guardarFacturaEIniciarCaptura', ComprasController.guardarFacturaEIniciarCapturaLotes)
router.get('/articulosGenerarPDF/:id_comp', ComprasController.generarPDFListado)
router.get('/nombreArchivoPDF/:id_comp', ComprasController.nombreArchivoPDF)


router.get('/compraProveedorPorRecibir/:id_empresa_sucursal', ComprasController.getAllCompras_ProveedorParaRecibir)
router.patch('/marcarRecibida/:id_comp', ComprasController.marcarCompraProveedorComoRecibida)
router.patch('/iniciarChecado/:id_comp', ComprasController.iniciarChecado)
router.patch('/iniciarAcomodo/:id_comp', ComprasController.iniciarAcomodo)
router.patch('/finalizarAcomodo/:id_comp', ComprasController.finalizarAcomodo)
router.patch('/finalizar/:id_empresa_sucursal', ComprasController.finalizarCompras)



export default router