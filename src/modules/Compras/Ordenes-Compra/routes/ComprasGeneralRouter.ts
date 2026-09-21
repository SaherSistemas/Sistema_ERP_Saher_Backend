import { Router } from "express";
import { ComprasGeneralesController } from "../controllers/CompraGeneralesController";
import { authMiddleware } from "../../../../middleware/auth";
const router = Router();

//SOLO DEJAREMOS LAS COMPRAS GENERALES
router.get('/:id_empresa', ComprasGeneralesController.getAll)                                    //Compra General paginada

router.get('/enCaptura/:id_empresa', authMiddleware, ComprasGeneralesController.getByEmpresaEnCaptura)           // Compras General en captura

router.patch('/reabrir/:id_compra_general', ComprasGeneralesController.reabrirCompra)                //CONTINUAR UNA COMPRA CUYAS ÓRDENES AÚN NO SE ENVÍAN

router.patch('/finalizar/:id_empresa_sucursal', ComprasGeneralesController.finalizarCapturaCompraGenYCompraProv)     //FINALIZAR COMPRA GENERAL


export default router