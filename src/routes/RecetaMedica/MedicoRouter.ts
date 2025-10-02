import { Router } from "express";
import { MedicoController } from "../../controllers/RecetaMedica/MedicoController";

const router = Router();

router.get('/:identificador_medico', MedicoController.getByID);
router.get('/', MedicoController.getAll);
router.post('/', MedicoController.create);


export default router;
