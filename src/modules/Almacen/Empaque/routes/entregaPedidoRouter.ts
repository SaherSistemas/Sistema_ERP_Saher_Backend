import { Router } from 'express';
import { Entrega_PedidoController } from '../controllers/Entrega_PedidoController';

const router = Router();

router.post('/', Entrega_PedidoController.crearSalida);

router.get('/', Entrega_PedidoController.obtenerPedidosPorEntregar);
router.post('/firma', Entrega_PedidoController.crearFirma)
export default router;