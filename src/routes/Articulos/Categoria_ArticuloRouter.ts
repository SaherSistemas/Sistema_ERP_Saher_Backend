import { Router } from "express";
import { Categoria_ArticuloController } from "../../controllers/Articulos/Categoria_ArticuloController";

const router = Router();

router.post('/', Categoria_ArticuloController.create);
router.get('/', Categoria_ArticuloController.getAll);
router.get('/tipo_articulo/:id_tipo_art', Categoria_ArticuloController.obtenerPorTipo)
router.get('/:id_categoria', Categoria_ArticuloController.getByID)
router.put('/:id_categoria', Categoria_ArticuloController.actualizarByID)
export default router;