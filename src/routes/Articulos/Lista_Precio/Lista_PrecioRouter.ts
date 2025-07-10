import { Router } from "express";
import { ListaPreciosController } from "../../../controllers/Articulos/Lista_Precio/Lista_PrecioContorller";
const router = Router();

router.get("/", ListaPreciosController.getAll);
//router.get("/:id", ListaPreciosController.getById);
router.post("/", ListaPreciosController.create);
//router.put("/:id", ListaPreciosController.update);
// router.delete("/:id", ListaPreciosController.delete);

export default router;
