import { Router } from "express";
import { AcomodoController } from "../controllers/AcomodoController";

const router = Router();

// Listar con filtro backend
router.get("/pendientes", AcomodoController.getArticulosPendientes);
router.patch("/acomodar", AcomodoController.acomodarArticulo)
router.get("/pendientes-default", AcomodoController.getPendientesConDefault);
router.post("/acomodar-default", AcomodoController.acomodarEnDefault);

export default router;
