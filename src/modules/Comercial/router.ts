import { Router } from "express";
import pedidoRouter from './Pedido/routes/Pedido_AlmecenRouter'
import catalogoRouter from './Catalogo/routes/catalogoRouter'

import { authMiddleware } from "../../middleware/auth";
const router = Router()

router.use('/pedido', authMiddleware, pedidoRouter)
router.use('/catalogo', authMiddleware, catalogoRouter)
export default router