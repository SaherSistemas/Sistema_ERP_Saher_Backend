import { Router } from "express";
import acomodoRouter from "./Acomodo/routes/AcomodoRouter"
import ubicacion_Router from './Ubicaciones/routes/ubicacion_SucursalRoutes';
import recepcionesRouter from './Recepciones/routes/Recepciones.route';
import { authMiddleware } from "../../middleware/auth";
const router = Router()

router.use('/acomodo', authMiddleware, acomodoRouter)
router.use('/ubicaciones', authMiddleware, ubicacion_Router)
router.use('/recepciones', authMiddleware, recepcionesRouter)
export default router