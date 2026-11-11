import { Router } from "express";
import { Articulo_Ubicacion_DefaultController } from "./Articulo_Ubicacion_DefaultController";


const router = Router({ mergeParams: true });

router.get("/", Articulo_Ubicacion_DefaultController.getByIDArticulo);
router.get("/conExistencia", Articulo_Ubicacion_DefaultController.getByIDArticuloConExistencia)
router.get("/lotes-en-existencia", Articulo_Ubicacion_DefaultController.getLotesEnExistencia)
router.put("/", Articulo_Ubicacion_DefaultController.actualizarOCrear)

export default router;
