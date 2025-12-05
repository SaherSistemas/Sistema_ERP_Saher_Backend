import { MovimientoMonederoController } from "../../../controllers/Clientes/Monedero/MovimientoMonederoController";
import { Router } from "express";

const router = Router();

// Obtener todos los movimientos de un monedero
router.get("/:id_monedero", MovimientoMonederoController.getMovimientosByMonedero);

// Ajustar saldo manualmente (para administración o correcciones)
router.post("/:id_monedero/ajustar", MovimientoMonederoController.ajustarSaldo);

export default router;