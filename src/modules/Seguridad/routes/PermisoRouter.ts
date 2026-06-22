import { Router } from "express";
import { PermisoController } from "../controllers/PermisoController";

const router = Router()

router.get('/', PermisoController.getAll)
router.get('/:id_permiso', PermisoController.getByID)
router.post('/', PermisoController.create)
router.put('/:id_permiso', PermisoController.update)
router.delete('/:id_permiso', PermisoController.delete)
router.post('/seed-finanzas-cxp', PermisoController.seedFinanzasCxP)
router.post('/seed-facturacion', PermisoController.seedFacturacion)
router.post('/seed-vales', PermisoController.seedVales)
router.post('/seed-inventario', PermisoController.seedInventario)
export default router;