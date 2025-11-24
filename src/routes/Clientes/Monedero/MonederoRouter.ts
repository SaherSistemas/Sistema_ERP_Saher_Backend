import { Router } from "express";
import { MonederoController } from "../../../controllers/Clientes/Monedero/MonederoController";
const router = Router();


router.get('/:telefono', MonederoController.getByID);
router.get('/', MonederoController.getAll);
router.post('/', MonederoController.create);
router.delete("/:id", MonederoController.deleteMonedero);
router.patch("/acumular/:telefono_cliente", MonederoController.acumularSaldo);

export default router;