import { Router } from "express";
import { ComprasController } from "../../controllers/Compras/CompraController";
const router = Router();

router.get('/:id_empresa', ComprasController.getAll)
router.post('/', ComprasController.createCompra)

export default router