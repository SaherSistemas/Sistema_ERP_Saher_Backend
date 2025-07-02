import { Router } from "express";
import { LotesRecibidosCompraController } from "../../controllers/LotesYCaducidades/LotesSolicitadosCompraController";
const router = Router();


router.post('/', LotesRecibidosCompraController.guardarLoteQueVieneEnFactura)

export default router;