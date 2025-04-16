import { Router } from "express";
import { UnidadMedidaController } from "../../controllers/Articulos/UnidadMedidaController";

const router = Router();

router.post('/', UnidadMedidaController.create);
router.get('/', UnidadMedidaController.getAll)
export default router;