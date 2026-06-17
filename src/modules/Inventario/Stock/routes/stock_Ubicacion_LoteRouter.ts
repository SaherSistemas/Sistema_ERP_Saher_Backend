import { Router } from "express";
import { authMiddleware } from "../../../../middleware/auth";
import { Stock_Ubicacion_LoteController } from "../controllers/Stock_Ubicacion_LoteController";

const router = Router()

router.post("/add", Stock_Ubicacion_LoteController.add);
router.post("/mover", Stock_Ubicacion_LoteController.mover);
router.get("/ubicacion/:id_ubicacion_sucursal", Stock_Ubicacion_LoteController.getByUbicacion);
router.get('/existencias', Stock_Ubicacion_LoteController.obtenerExistencias);
//router.get('/', authMiddleware, Stock_Ubicacion_LoteController.getAllPorSucursal)
//router.post("/", authMiddleware, Stock_Ubicacion_LoteController.create);
//router.get('/:id', Stock_Ubicacion_LoteController.getById)
//router.get('/sucursal/:id_sucursal', Stock_Ubicacion_LoteController.getBySucursal)

export default router;