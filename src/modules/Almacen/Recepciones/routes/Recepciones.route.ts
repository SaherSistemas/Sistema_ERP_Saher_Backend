import { Router } from "express";
import { Recepcion_EntradaController } from "../controllers/Recepcion_EntradaController";

const router = Router();

router.get("/", Recepcion_EntradaController.list);
router.post("/", Recepcion_EntradaController.create);
router.get("/:id", Recepcion_EntradaController.getById);

export default router;
