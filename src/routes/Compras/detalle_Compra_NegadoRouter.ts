import { Router } from "express";
import { Detalle_Compra_NegadoController } from "../../controllers/Compras/Detalle_Compra_NegadoController";
const router = Router();


router.post('/', Detalle_Compra_NegadoController.createDetalleCompraNegados)
router.patch('/:id_detcompneg', Detalle_Compra_NegadoController.recuperadoTrue)


export default router