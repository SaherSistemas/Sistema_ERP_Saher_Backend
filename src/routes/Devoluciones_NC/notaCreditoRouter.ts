import { Router } from "express";
import { NotasCreditoController } from "../../controllers/Devolucion_NC/NotasCreditoController";

const router = Router();

router.post("/", NotasCreditoController.createNotaCredito);


export default router;
