import { Router } from "express";
import { Margen_Ganancia_ListaController } from "../../controllers/Costo_Y_Precios/Margen_Ganancia_ListaController";

const router = Router();

router.get("/", Margen_Ganancia_ListaController.getAll);

router.post("/", Margen_Ganancia_ListaController.create);
router.put("/update/:id", Margen_Ganancia_ListaController.update);
router.get("/:id_categoria/:id_presentacion", Margen_Ganancia_ListaController.getPorProducto);

export default router;
