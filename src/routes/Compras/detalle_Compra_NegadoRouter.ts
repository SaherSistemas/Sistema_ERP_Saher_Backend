import { Router } from "express";
import { Detalle_Compra_NegadoController } from "../../controllers/Compras/Detalle_Compra_NegadoController";
const router = Router();


router.post('/', Detalle_Compra_NegadoController.createDetalleCompraNegados)




export default router