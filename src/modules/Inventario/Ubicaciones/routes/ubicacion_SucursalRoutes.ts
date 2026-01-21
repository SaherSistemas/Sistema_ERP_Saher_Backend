import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";

const router = Router()

router.get('/', Ubicacion_SucursalController.getAll)
router.post("/", Ubicacion_SucursalController.create);
router.get('/:id', Ubicacion_SucursalController.getById)
router.get('/sucursal/:id_sucursal', Ubicacion_SucursalController.getBySucursal)

export default router;