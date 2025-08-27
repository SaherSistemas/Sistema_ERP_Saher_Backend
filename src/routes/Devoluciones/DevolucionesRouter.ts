import { Router } from "express";
import { DevolucionController } from "../../controllers/Devolucion/DevolucionController";

const router = Router();

router.get("/:id_comp", DevolucionController.getArticulosDeDevolucionPorID);


export default router;
