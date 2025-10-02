import { Router } from "express";
import { RecetaMedicaController } from "../../controllers/RecetaMedica/RecetaMedicaController";

const router = Router();

router.get('/', RecetaMedicaController.getAll);
router.post('/', RecetaMedicaController.create);


export default router;
