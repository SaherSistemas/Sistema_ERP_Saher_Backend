import { Router } from "express";
import { ListaPrecioController } from "../../../controllers/Articulos/Lista_Precio/Lista_PrecioController";
const router = Router();

router.get("/", ListaPrecioController.getAll);
router.get("/:id", ListaPrecioController.getById);
router.post("/", ListaPrecioController.create);
router.put("/update/:id", ListaPrecioController.update);

export default router;
