import { Router } from "express";
import { LoteUsadoVentaController } from "../../controllers/LotesYCaducidades/Lote_Usado_VentaController"

const router = Router();

router.get('/', LoteUsadoVentaController.getAll);
router.get('/:id', LoteUsadoVentaController.getByID);
router.post('/', LoteUsadoVentaController.create);
//router.put('/id_lote_sucursal/:id', LoteUsadoVentaController.updateByID);


export default router;
