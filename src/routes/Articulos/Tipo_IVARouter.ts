import { Router } from "express";
import { Tipo_IVAController } from "../../controllers/Articulos/Tipo_IVAController";
const router = Router();

router.get('/', Tipo_IVAController.getAll);
router.post('/', Tipo_IVAController.create);
router.get('/:id_iva', Tipo_IVAController.getByID);
router.put('/:id_iva', Tipo_IVAController.updateByID)

export default router