import { Router } from 'express';
import { Pedido_AlmacenController } from '../controllers/Pedido_AlmacenController';

const router = Router();

router.get('/dia/agente', Pedido_AlmacenController.getAllPorDiaAgente)
router.get('/enCaptura', Pedido_AlmacenController.pedidosEnCaptura);
router.get('/enCotizacion', Pedido_AlmacenController.pedidosEnCotizacion);
router.get('/surtir', Pedido_AlmacenController.porSurtir);
router.put('/actualizar_detalles', Pedido_AlmacenController.actualizarDetalles)
router.put('/finalizar_pedido', Pedido_AlmacenController.finalizarCaptura)
router.post('/asignar_pedido_surtidor', Pedido_AlmacenController.asignarPedidoSurtidor)

router.get('/:id_pedido_alm/detalle_asignado', Pedido_AlmacenController.getDetallesAsignado);
//DETALLE SURTIDO 
router.patch(`/detalle_asignacion/:id/estado`, Pedido_AlmacenController.surtidoArticuloAsignado)


//CHEQUEO 
router.get('/chequeo', Pedido_AlmacenController.pedidosEnChequeo)
router.post('/asignar_pedido_chequeo/:id_pedido_alm', Pedido_AlmacenController.asignarPedidoChequeo);
router.get('/:id_pedido_alm/detalle_asignado_chequeo', Pedido_AlmacenController.getDetallesAsignadoChequeo);
router.post('/:id_pedido_alm/chequeo_articulo', Pedido_AlmacenController.checarArticulo)

// 1. RUTAS ESPECÍFICAS PRIMERO
router.get('/cod/:cod', Pedido_AlmacenController.getByCodInterno);
router.get('/:id_pedido/detalles', Pedido_AlmacenController.getDetalles);

// 2. RUTA GENÉRICA AL FINAL
router.get('/:id', Pedido_AlmacenController.getByID);

// POST / PUT
router.post('/', Pedido_AlmacenController.create);
//router.put('/:id', Pedido_AlmacenController.update);

export default router;
