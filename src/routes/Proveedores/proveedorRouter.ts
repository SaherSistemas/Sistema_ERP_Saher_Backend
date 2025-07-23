import { Router } from "express";
import { ProveedorController } from "../../controllers/Proveedor/ProveedorController"
const router = Router()

router.get('/', ProveedorController.getAllProveedores)
router.post('/', ProveedorController.crearProveedor)
router.get('/:id_prove', ProveedorController.getByIdProveedor)
router.put('/:id_prove', ProveedorController.updateProveedor)

router.get('/proveedorDeLaCompra/:id_comp', ProveedorController.getProveedorDeLaCompra)

router.delete('/cambiarStatus/:id_prove', ProveedorController.cambiarStatus)
export default router;