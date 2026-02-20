import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";


const router = Router()
router.get("/meta", Ubicacion_SucursalController.getMeta);
router.get("/filtradas", Ubicacion_SucursalController.getAllFiltered);
router.post("/", Ubicacion_SucursalController.create);





export default router;