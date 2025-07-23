import { Router } from "express";
import { Presentacion_ArticuloController } from "../../controllers/Articulos/Presentacion_Articulo";

const router = Router();

router.post('/', Presentacion_ArticuloController.create);
router.get('/', Presentacion_ArticuloController.getAll);
router.get('/:id_presentacion', Presentacion_ArticuloController.getByID)
router.put('/:id_presentacion', Presentacion_ArticuloController.actualizarByID)
export default router;