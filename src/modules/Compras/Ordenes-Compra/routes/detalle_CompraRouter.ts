import { Router } from "express";
import { Detalle_Compra_SolicitadoController } from "../controllers/Detalle_Compra_SolicitadoController";

const router = Router();


router.get('/:id_comp', Detalle_Compra_SolicitadoController.getAllArticulosPorCompra)




export default router