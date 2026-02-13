import { Router } from "express";
import { Articulo_Ubicacion_DefaultController } from "../controllers/Articulo_Ubicacion_DefaultController";

const router = Router();

router.get("/:id_articulo", Articulo_Ubicacion_DefaultController.getByIDArticulo);


export default router;
