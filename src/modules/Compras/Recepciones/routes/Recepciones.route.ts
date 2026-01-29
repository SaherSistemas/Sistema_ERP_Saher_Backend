import { Router } from "express";
import { Recepcion_EntradaController } from "../controllers/Recepcion_EntradaController";
import { authMiddleware } from "../../../../middleware/auth";

const router = Router();

// Listar con filtro backend
router.get("/", Recepcion_EntradaController.list);

// Crear
router.post("/", authMiddleware, Recepcion_EntradaController.create);

// Obtener firma como imagen png
router.get("/:id/firma", Recepcion_EntradaController.getFirma);

// Obtener recepción (sin firma binaria)
router.get("/:id", authMiddleware, Recepcion_EntradaController.getById);



export default router;
