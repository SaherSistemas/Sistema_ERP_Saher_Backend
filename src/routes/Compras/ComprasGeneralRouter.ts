import { Router } from "express";
import { ComprasGeneralesController } from "../../controllers/Compras/CompraGeneralesController";
const router = Router();

//SOLO DEJAREMOS LAS COMPRAS GENERALES
router.get('/:id_empresa', ComprasGeneralesController.getAll)                                    //Compra General paginada

router.get('/enCaptura/:id_empresa', ComprasGeneralesController.getByEmpresaEnCaptura)           // Compras General en captura

router.patch('/finalizar/:id_empresa_sucursal', ComprasGeneralesController.finalizarCompras)     //FINALIZAR COMPRA GENERAL

export default router