import { Router } from "express";
import { TipoClienteController } from "../../controllers/Clientes/Tipo_ClienteController"; 
const router = Router();


router.get('/', TipoClienteController.getAll);
router.post('/', TipoClienteController.create);

export default router;