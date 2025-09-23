import { Router } from "express";
import { DevolucionController } from "../../controllers/Devolucion_NC/DevolucionController";

const router = Router();

router.get("/:id_comp", DevolucionController.getArticulosDeDevolucionPorID);


export default router;
