import { Router } from 'express';
import { ArticuloController } from '../controllers/ArticuloController';
const router = Router();

router.post('/', ArticuloController.create);
router.get('/paraVenta/:cantidad/:cod_barr_artic', ArticuloController.getAllParaVenta);
router.get('/', ArticuloController.getAllPaginados);
router.get('/paginaDeArticulo/:id_artic', ArticuloController.getPaginaArticuloParaContinuarCompra);
router.get('/paraCompra/:id_empresasucursal', ArticuloController.getAllParaCompra);
router.get('/negados/:id_empresa_sucursal', ArticuloController.getAllArticulosNegadosParaCompra);
router.get('/:id_articulo', ArticuloController.getByID);
router.put('/:id_articulo', ArticuloController.actualizarByID);

export default router;
