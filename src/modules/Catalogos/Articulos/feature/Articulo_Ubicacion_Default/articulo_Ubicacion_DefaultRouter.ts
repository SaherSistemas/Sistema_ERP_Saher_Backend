import { Router } from "express";
import { Articulo_Ubicacion_DefaultController } from "./Articulo_Ubicacion_DefaultController";


const router = Router({ mergeParams: true });

router.get("/", Articulo_Ubicacion_DefaultController.getByIDArticulo);
router.get("/conExistencia", Articulo_Ubicacion_DefaultController.getByIDArticuloConExistencia)
router.put("/", Articulo_Ubicacion_DefaultController.actualizarOCrear)

export default router;
