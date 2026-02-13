import { Router } from "express";
import acomodoRouter from "./Acomodo/routes/AcomodoRouter"
import ubicacion_Router from './Ubicaciones/routes/ubicacion_SucursalRoutes';
import recepcionesRouter from './Recepciones/routes/Recepciones.route';
import articulo_Ubicacion_DefaultRouter from './Articulo_Ubicacion_Default/routes/Articulo_Ubicacion_DefaultRouter'
import { authMiddleware } from "../../middleware/auth";
const router = Router()

router.use('/acomodo', authMiddleware, acomodoRouter)
router.use('/ubicaciones', authMiddleware, ubicacion_Router)
router.use('/recepciones', authMiddleware, recepcionesRouter)
router.use('/articulo_ubicacion_default', authMiddleware, articulo_Ubicacion_DefaultRouter)
export default router