import { Router } from "express";
import { AcomodoController } from "../controllers/AcomodoController";

const router = Router();

// Listar con filtro backend
router.get("/pendientes", AcomodoController.getArticulosPendientes);


export default router;
