import { Router } from 'express';
import { Pedido_AlmacenController } from '../controllers/Pedido_AlmacenController';

const router = Router();

router.get('/dia/agente', Pedido_AlmacenController.getAllPorDiaAgente)
router.get('/enCaptura', Pedido_AlmacenController.pedidosEnCaptura);
router.get('/enCotizacion', Pedido_AlmacenController.pedidosEnCotizacion);

router.put('/actualizar_detalles', Pedido_AlmacenController.actualizarDetalles)
router.put('/finalizar_pedido', Pedido_AlmacenController.finalizarCaptura)
// 1. RUTAS ESPECÍFICAS PRIMERO
router.get('/cod/:cod', Pedido_AlmacenController.getByCodInterno);
router.get('/:id_pedido/detalles', Pedido_AlmacenController.getDetalles);

// 2. RUTA GENÉRICA AL FINAL
router.get('/:id', Pedido_AlmacenController.getByID);

// POST / PUT
router.post('/', Pedido_AlmacenController.create);
//router.put('/:id', Pedido_AlmacenController.update);

export default router;
