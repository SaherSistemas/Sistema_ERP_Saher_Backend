import { Router } from "express";
import { MonederoController } from "../../../controllers/Clientes/Monedero/MonederoController";
const router = Router();


router.get('/:identificador_cliente', MonederoController.getByID);
router.get('/', MonederoController.getAll);
router.post('/', MonederoController.create);
router.delete("/:id", MonederoController.deleteMonedero);

export default router;