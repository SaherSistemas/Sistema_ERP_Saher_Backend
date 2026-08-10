import { Router } from "express";
import { Margen_Ganancia_ListaController } from "../controllers/Margen_Ganancia_ListaController";

const router = Router();

router.get("/", Margen_Ganancia_ListaController.getAll);
router.get("/pendientes", Margen_Ganancia_ListaController.getArticulosPendientes);

router.post("/", Margen_Ganancia_ListaController.create);
router.post("/recalcular", Margen_Ganancia_ListaController.recalcularPreciosArticulo);
router.put("/update/:id", Margen_Ganancia_ListaController.update);
router.get("/:id_categoria/:id_presentacion", Margen_Ganancia_ListaController.getPorProducto);

export default router;
