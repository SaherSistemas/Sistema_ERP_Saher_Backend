import { Router } from 'express';
import { Entrega_PedidoController } from '../controllers/Entrega_PedidoController';

const router = Router();

// GET /api/almacen/entrega_cliente_directo/pedidos?tipo=ALMACEN|AGENTE
router.get('/pedidos', Entrega_PedidoController.obtenerPedidosParaEntregaCliente);

// POST /api/almacen/entrega_cliente_directo
router.post('/', Entrega_PedidoController.crearSalida);

// POST /api/almacen/entrega_cliente_directo/firma
router.post('/firma', Entrega_PedidoController.crearFirma);

export default router;
