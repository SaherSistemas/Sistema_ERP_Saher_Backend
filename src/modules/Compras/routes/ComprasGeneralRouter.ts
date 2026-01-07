import { Router } from "express";
import { ComprasGeneralesController } from "../controllers/CompraGeneralesController";
const router = Router();

//SOLO DEJAREMOS LAS COMPRAS GENERALES
router.get('/:id_empresa', ComprasGeneralesController.getAll)                                    //Compra General paginada

router.get('/enCaptura/:id_empresa', ComprasGeneralesController.getByEmpresaEnCaptura)           // Compras General en captura

router.patch('/finalizar/:id_empresa_sucursal', ComprasGeneralesController.finalizarCapturaCompraGenYCompraProv)     //FINALIZAR COMPRA GENERAL

export default router