import { Router } from "express";
import impresoraRouter from './routes/impresoraRouter'
import trabajoImpresionRouter from './routes/trabajoImpresionRouter'

import { authMiddleware } from "../../middleware/auth";
const router = Router()

router.use('/impresora', authMiddleware, impresoraRouter)
router.use('/trabajo', authMiddleware, trabajoImpresionRouter)

export default router