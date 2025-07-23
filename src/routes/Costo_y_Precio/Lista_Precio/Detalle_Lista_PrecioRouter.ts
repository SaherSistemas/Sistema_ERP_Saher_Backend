import { Router } from "express";
import { DetalleListaPrecioController } from "../../../controllers/Costo_Y_Precios/Lista_Precio/Detalle_Lista_PrecioController";
const router = Router();

router.get("/", DetalleListaPrecioController.getAll);
router.post("/", DetalleListaPrecioController.create);
router.put("/:id_detalle", DetalleListaPrecioController.update);

//router.put("/:id", DetalleListaPrecioController.update);
// router.delete("/:id", ListaPreciosController.delete);

export default router;
