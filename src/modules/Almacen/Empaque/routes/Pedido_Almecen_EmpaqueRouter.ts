import { Router } from 'express';
import { Pedido_Almacen_EmpaqueController } from '../controllers/Pedido_Almacen_EmpaqueController';
import entregaPedidoRouter from './entregaPedidoRouter'
const router = Router();
router.use('/entrega_pedido', entregaPedidoRouter);
router.get('/', Pedido_Almacen_EmpaqueController.obtenerPedidoEmpacando);
router.post('/:id_pedido_alm/iniciar', Pedido_Almacen_EmpaqueController.iniciarEmpaquePedido);
router.post('/:id_pedido_empaque/finalizar', Pedido_Almacen_EmpaqueController.finalizarEmpaquePedido);

router.patch('/:id_pedido_alm/bultos', Pedido_Almacen_EmpaqueController.actualizarBultosEmpaque);
router.post('/:id_pedido_alm/reabrir', Pedido_Almacen_EmpaqueController.reabrirEmpaquePedido);

export default router;