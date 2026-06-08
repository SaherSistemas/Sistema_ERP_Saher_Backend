import { Router } from 'express';
import { ArticuloController } from '../controllers/ArticuloController';

import articulo_Ubicacion_DefaultRouter from '../feature/Articulo_Ubicacion_Default/articulo_Ubicacion_DefaultRouter'
import { authMiddleware } from '../../../../middleware/auth';
const router = Router();

router.post('/', ArticuloController.create);
router.get('/buscar', ArticuloController.getBycodBarroNombre);
router.get('/buscarPorCodigoBarras/:cod_barr_artic', ArticuloController.getByCodigoBarras);
router.get('/paraVenta/:cantidad/:cod_barr_artic', ArticuloController.getAllParaVenta);
router.get('/', ArticuloController.getAllPaginados);
router.get('/paginaDeArticulo/:id_artic', ArticuloController.getPaginaArticuloParaContinuarCompra);
router.get('/paraCompra/:id_empresasucursal', ArticuloController.getAllParaCompra);
router.get('/negados/:id_empresa_sucursal', ArticuloController.getAllArticulosNegadosParaCompra);
router.get('/:id_artic/panel-precios', ArticuloController.getPanelPrecios);
router.put('/:id_artic/precio', ArticuloController.upsertPrecio);
router.get('/:id_articulo', ArticuloController.getByID);
router.put('/:id_articulo', ArticuloController.actualizarByID);



router.use('/:id_articulo/ubicacion-default', authMiddleware, articulo_Ubicacion_DefaultRouter);

export default router;
