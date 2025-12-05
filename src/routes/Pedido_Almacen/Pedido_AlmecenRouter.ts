import { Router } from 'express';
import { Pedido_AlmacenController } from '../../controllers/Pedido_Almacen/Pedido_AlmacenController';

const router = Router();

router.get('/', Pedido_AlmacenController.getAll);
router.get('/enCaptura', Pedido_AlmacenController.pedidosEnCaptura);
router.get('/enCotizacion', Pedido_AlmacenController.pedidosEnCotizacion);

// 1. RUTAS ESPECÍFICAS PRIMERO
router.get('/cod/:cod', Pedido_AlmacenController.getByCodInterno);
router.get('/:id_pedido/detalles', Pedido_AlmacenController.getDetalles);

// 2. RUTA GENÉRICA AL FINAL
router.get('/:id', Pedido_AlmacenController.getByID);

// POST / PUT
router.post('/', Pedido_AlmacenController.create);
router.put('/:id', Pedido_AlmacenController.update);

export default router;
