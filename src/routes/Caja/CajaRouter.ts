import { Router } from "express";
import { CajaController } from "../../controllers/Caja/CajaController";

const router = Router();

router.get('/:id_caja', CajaController.getByID);
router.get('/', CajaController.getAll);
router.get('/empresa/:id_empre', CajaController.getAllCajasSucursal);

router.post('/', CajaController.create);
router.get('/cantidad/:id_empre', CajaController.getCantidadCajasPorSucursal);
router.put('/activar/:id_caja', CajaController.activarCaja);
router.put('/desactivar/:id_caja', CajaController.desactivarCaja);

export default router;
