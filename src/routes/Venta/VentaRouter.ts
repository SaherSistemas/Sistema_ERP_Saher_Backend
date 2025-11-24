import { Router } from "express";
import { VentaController } from "../../controllers/Venta/VentaController";

const router = Router();

router.get("/", VentaController.getAll);
router.get("/resumen/:id_corte", VentaController.getResumenCorte);
router.patch("/cancelar/:id", VentaController.cancelar)
router.get("/:id", VentaController.getByID);
router.post("/", VentaController.create);

export default router;
