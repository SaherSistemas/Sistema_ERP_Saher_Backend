import { Router } from "express";
import { ProveedorController } from "../../controllers/ProveedorController"
const router = Router()

router.get('/', ProveedorController.getAllProveedores)
router.post('/', ProveedorController.crearProveedor)
export default router;