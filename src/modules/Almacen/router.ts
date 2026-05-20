import { Router } from "express";
import acomodoRouter from "./Acomodo/routes/AcomodoRouter"
import ubicacion_Router from './Ubicaciones/routes/ubicacion_SucursalRoutes';
import recepcionesRouter from './Recepciones/routes/Recepciones.route';
import { authMiddleware } from "../../middleware/auth";
import pedidoRouter from './Pedido/routes/Pedido_AlmecenRouter'
import pedido_EmpaqueRouter from './Empaque/routes/Pedido_Almecen_EmpaqueRouter'
import entregaClienteDirectoRouter from './Empaque/routes/entregaClienteDirectoRouter'
import kardexRouter from './Kardex/routes/KardexRouter'
import movimientoRouter from './Movimientos/routes/Movimiento_ArticuloRouter'
const router = Router()

router.use('/entrega_cliente_directo', authMiddleware, entregaClienteDirectoRouter)
router.use('/acomodo', authMiddleware, acomodoRouter)
router.use('/ubicaciones', authMiddleware, ubicacion_Router)
router.use('/recepciones', authMiddleware, recepcionesRouter)
router.use('/pedido', authMiddleware, pedidoRouter)
router.use('/empaque', authMiddleware, pedido_EmpaqueRouter)
router.use('/kardex', authMiddleware, kardexRouter)
router.use('/movimientos_articulo', authMiddleware, movimientoRouter)

export default router