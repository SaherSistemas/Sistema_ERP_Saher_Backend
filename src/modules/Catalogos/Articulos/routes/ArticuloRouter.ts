import { Router } from 'express';
import { ArticuloController } from '../controllers/ArticuloController';

import articulo_Ubicacion_DefaultRouter from '../feature/Articulo_Ubicacion_Default/articulo_Ubicacion_DefaultRouter'
import { Articulo_Ubicacion_DefaultController } from '../feature/Articulo_Ubicacion_Default/Articulo_Ubicacion_DefaultController';
import { authMiddleware } from '../../../../middleware/auth';
const router = Router();

router.post('/', ArticuloController.create);
router.get('/buscar', ArticuloController.getBycodBarroNombre);
router.get('/buscarPorCodigoBarras/:cod_barr_artic', ArticuloController.getByCodigoBarras);
router.get('/paraVenta/:cantidad/:cod_barr_artic', ArticuloController.getAllParaVenta);
router.get('/', authMiddleware, ArticuloController.getAllPaginados);
router.get('/paginaDeArticulo/:id_artic', ArticuloController.getPaginaArticuloParaContinuarCompra);
router.get('/paraCompra/:id_empresasucursal', ArticuloController.getAllParaCompra);
router.get('/negados/:id_empresa_sucursal', ArticuloController.getAllArticulosNegadosParaCompra);
router.get('/:id_artic/existencia', authMiddleware, ArticuloController.getExistencia);
router.get('/ubicacion-default/conflictos', authMiddleware, Articulo_Ubicacion_DefaultController.getConflictos);
router.get('/ubicacion-default/sin-asignar', authMiddleware, Articulo_Ubicacion_DefaultController.getSinUbicacionDefault);
router.get('/ubicacion-default/libres', authMiddleware, Articulo_Ubicacion_DefaultController.getUbicacionesLibres);
router.delete('/ubicacion-default/:id_articulo_ubicacion_default', authMiddleware, Articulo_Ubicacion_DefaultController.eliminarDefault);
router.get('/:id_artic/panel-precios', authMiddleware, ArticuloController.getPanelPrecios);
router.put('/:id_artic/precio', ArticuloController.upsertPrecio);
router.patch('/:id_artic/colectivo', authMiddleware, ArticuloController.actualizarColectivo);
router.post('/:id_artic/recalcular-precios', authMiddleware, ArticuloController.recalcularPrecios);
router.get('/:id_articulo', ArticuloController.getByID);
router.put('/:id_articulo', ArticuloController.actualizarByID);



router.use('/:id_articulo/ubicacion-default', authMiddleware, articulo_Ubicacion_DefaultRouter);

export default router;
