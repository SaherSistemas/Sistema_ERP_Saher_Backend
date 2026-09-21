import { Router } from "express";
import { Detalle_Compra_SolicitadoController } from "../controllers/Detalle_Compra_SolicitadoController";
import { authMiddleware } from "../../../../middleware/auth";

const router = Router();


router.get('/:id_comp', Detalle_Compra_SolicitadoController.getAllArticulosPorCompra)
router.patch('/:id_detcompsol', authMiddleware, Detalle_Compra_SolicitadoController.actualizarCantidad); // cambia la cantidad pedida
router.delete('/:id_detcompsol', Detalle_Compra_SolicitadoController.deleteDetalleCompra);



export default router