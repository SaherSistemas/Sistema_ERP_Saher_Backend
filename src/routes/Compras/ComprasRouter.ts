import { Router } from "express";
import { ComprasController } from "../../controllers/Compras/CompraController";
const router = Router();

router.post('/', ComprasController.createCompra)
router.get('/:id_empresa', ComprasController.getAll)
router.get('/enCaptura/:id_empresa', ComprasController.getByEmpresaEnCaptura)
router.get('/compraProveedorPorGeneral/:id_compra_general', ComprasController.comprasProveedorPorIDCompraGeneral)
router.patch('/guardarFolioEIniciarCaptura', ComprasController.guardarFolioEIniciarCapturaLotes)
router.get('/articulosGenerarPDF/:id_comp', ComprasController.generarPDFListado)
router.patch('/finalizar/:id_empresa_sucursal', ComprasController.finalizarCompras)



export default router