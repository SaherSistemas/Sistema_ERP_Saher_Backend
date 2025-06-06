import { Router } from "express";
import { Tipo_ArticuloController } from "../../controllers/Articulos/Tipo_ArticuloController";
const router = Router();

router.get('/', Tipo_ArticuloController.getAll);
router.post('/', Tipo_ArticuloController.create);
router.get('/:id_tipo_art', Tipo_ArticuloController.getByID);
router.put('/:id_tipo_art', Tipo_ArticuloController.updateByID)

export default router