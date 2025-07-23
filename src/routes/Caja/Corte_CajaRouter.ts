import { Router } from "express";
import { CorteCajaController } from "../../controllers/Caja/Corte_CajaController";

const router = Router();

router.get('/:id_corte', CorteCajaController.getByID);
router.get('/', CorteCajaController.getAll);
router.post('/', CorteCajaController.create);
router.get('/cantidad/:id_caja', CorteCajaController.getCantidadCortesPorCaja);
router.patch('/cierre/:id_corte', CorteCajaController.updateCierreCorteCaja);

export default router;

