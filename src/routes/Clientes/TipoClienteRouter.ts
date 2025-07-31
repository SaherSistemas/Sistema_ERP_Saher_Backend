import { Router } from "express";
import { TipoClienteController } from "../../controllers/Clientes/Tipo_ClienteController"; 
const router = Router();


router.get('/', TipoClienteController.getAll);
router.get('/:id_o_nombre', TipoClienteController.getByIDFlexible);
router.post('/', TipoClienteController.create);

export default router;