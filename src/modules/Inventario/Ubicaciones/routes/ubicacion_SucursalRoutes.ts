import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";
import { authMiddleware } from "../../../../middleware/auth";

const router = Router()

router.get('/', authMiddleware, Ubicacion_SucursalController.getAllPorSucursal)
router.post("/", authMiddleware, Ubicacion_SucursalController.create);
router.get('/:id', Ubicacion_SucursalController.getById)
router.get('/sucursal/:id_sucursal', Ubicacion_SucursalController.getBySucursal)

export default router;