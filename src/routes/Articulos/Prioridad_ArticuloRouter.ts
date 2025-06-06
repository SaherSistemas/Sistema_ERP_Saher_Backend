import { Router } from "express";
import { Prioridad_ArticuloController } from "../../controllers/Articulos/Prioridad_ArticuloController";
const router = Router();

router.get('/', Prioridad_ArticuloController.getAll);
router.post('/', Prioridad_ArticuloController.create);
router.get('/:id_prioridad', Prioridad_ArticuloController.getByID);
router.put('/:id_prioridad', Prioridad_ArticuloController.updateByID)

export default router