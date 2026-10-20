import { Router } from 'express';
import { TableroAlmacenController } from '../controllers/TableroAlmacenController';

const router = Router();

router.get('/', TableroAlmacenController.getResumen);
router.get('/procesos', TableroAlmacenController.getProcesos);
router.get('/compras', TableroAlmacenController.getCompras);
router.get('/compras/pendientes', TableroAlmacenController.getComprasPendientes);
router.get('/compras/facturas', TableroAlmacenController.getComprasFacturas);
router.get('/compras/lista', TableroAlmacenController.getComprasLista);
router.get('/compras/lista/:tipo/:id/lineas', TableroAlmacenController.getComprasListaLineas);
router.get('/compras/facturas/:id_factura/detalle', TableroAlmacenController.getCompraFacturaDetalle);
router.get('/valor-costo', TableroAlmacenController.getValorCosto);
router.get('/valor-costo/:cod_int_artic/lotes', TableroAlmacenController.getLotesCosto);
router.patch('/valor-costo/lote/:id_lote', TableroAlmacenController.patchCostoLote);
router.get('/dias-inventario', TableroAlmacenController.getDiasInventario);
router.get('/dias-inventario/detalle', TableroAlmacenController.getDiasInventarioDetalle);
router.get('/negados', TableroAlmacenController.getNegadosVigentes);
router.get('/negados/resumen', TableroAlmacenController.getNegadosResumen);
router.get('/caducidades', TableroAlmacenController.getCaducidades);
router.get('/sin-existencia', TableroAlmacenController.getSinExistencia);
router.get('/apartadas', TableroAlmacenController.getApartadas);

export default router;
