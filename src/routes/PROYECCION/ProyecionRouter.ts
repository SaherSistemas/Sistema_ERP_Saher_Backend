import { Router } from "express";
import { Proyeccion_VentaController } from "../../controllers/PROYECCION/Proyeccion_VentaController";
const router = Router()

router.get('/', Proyeccion_VentaController.getProyeccionVenta)
export default router;