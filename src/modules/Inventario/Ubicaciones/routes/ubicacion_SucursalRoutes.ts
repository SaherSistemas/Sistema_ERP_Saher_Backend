import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";
import { authMiddleware } from "../../../../middleware/auth";
import { Ubicacion_ArticuloController } from "../controllers/Ubicacion_ArticuloController";

const router = Router()

router.get('/', authMiddleware, Ubicacion_SucursalController.getAll)
router.post("/", authMiddleware, Ubicacion_SucursalController.create);


// ===== UBICACIONES POR ARTÍCULO =====
router.get('/por-articulo/:id_articulo', authMiddleware, Ubicacion_ArticuloController.getByIDArticulo);



export default router;