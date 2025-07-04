import { Router } from "express";
import { CajaController } from "../../controllers/Caja/CajaController";  

const router = Router();

router.get('/:id_caja', CajaController.getByID);
router.get('/', CajaController.getAll);
router.post('/', CajaController.create);
router.get('/cantidad/:id_empre', CajaController.getCantidadCajasPorSucursal);


export default router;
