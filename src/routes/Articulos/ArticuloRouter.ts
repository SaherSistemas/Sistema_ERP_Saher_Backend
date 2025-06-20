import { Router } from "express";
import { ArticuloController } from "../../controllers/Articulos/ArticuloController";
const router = Router();

router.post('/', ArticuloController.create);
router.get('/', ArticuloController.getAllPaginados);
router.get('/paginaDeArticulo/:id_artic', ArticuloController.getPaginaArticuloParaContinuarCompra)
router.get('/paraCompra/:id_empresasucursal', ArticuloController.getAllParaCompra);
router.get('/:id_articulo', ArticuloController.getByID)
router.put('/:id_articulo', ArticuloController.actualizarByID)

export default router;