import { Router } from "express";
import { CorteCajaController } from "../../controllers/Caja/Corte_CajaController";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.get('/:id_corte', CorteCajaController.getByID);
router.get('/', CorteCajaController.getAll);

router.get('/caja/:id_caja', CorteCajaController.getAllByCaja);
router.get('/empresa/:id_empresa/abiertos', CorteCajaController.getCortesAbiertosporEmpresa);

router.post('/abrir/:id_caja', authMiddleware, CorteCajaController.create);
router.patch('/cerrar/:id_caja', CorteCajaController.update);

router.get('/total/:id_corte', CorteCajaController.getTotalCaja);

router.get('/cantidad/:id_caja', CorteCajaController.getCantidadCortesPorCaja);

export default router;

