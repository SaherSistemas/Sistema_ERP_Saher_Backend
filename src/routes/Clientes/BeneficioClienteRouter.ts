import { Router } from "express";
import { BeneficioClienteController } from "../../controllers/Clientes/Beneficio_ClienteController"; 

const router = Router();


router.get('/', BeneficioClienteController.getAll);
router.post('/', BeneficioClienteController.create);

export default router;