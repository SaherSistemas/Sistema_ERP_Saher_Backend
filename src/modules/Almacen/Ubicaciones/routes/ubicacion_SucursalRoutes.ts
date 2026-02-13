import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";


const router = Router()

router.get('/', Ubicacion_SucursalController.getAll)
router.post("/", Ubicacion_SucursalController.create);





export default router;