import { Router } from "express";
import stockRouter from "./Stock/routes/stock_Ubicacion_LoteRouter"
import { authMiddleware } from "../../middleware/auth";
const router = Router()

router.use('/stock', stockRouter)

export default router