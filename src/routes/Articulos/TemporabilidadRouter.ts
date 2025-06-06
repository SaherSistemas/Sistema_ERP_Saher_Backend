import { Router } from "express";
import { TemporabilidadController } from "../../controllers/Articulos/TemporabilidadController";
const router = Router();

router.get('/', TemporabilidadController.getAll);
router.post('/', TemporabilidadController.create);
router.get('/:id_tempo', TemporabilidadController.getByID);
router.put('/:id_tempo', TemporabilidadController.updateByID)

export default router