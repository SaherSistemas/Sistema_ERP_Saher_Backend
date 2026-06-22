import { Router } from "express";
import stockRouter from "./Stock/routes/stock_Ubicacion_LoteRouter";
import inventarioRouter from "./Conteo/routes/InventarioRouter";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.use('/stock',  authMiddleware, stockRouter);
router.use('/conteo', authMiddleware, inventarioRouter);

export default router;