import { Router } from "express";
import { Empresa_SucursalController } from "../../controllers/Empresa_Sucursal/Empresa_SucursalController";

const router = Router();
router.get('/', Empresa_SucursalController.getAllEmpresas)
router.get('/:id_empresaSucursal', Empresa_SucursalController.getEmpresaSucursalByID)
router.post('/', Empresa_SucursalController.crearEmpresaSucursal)
router.put('/:id_empresaSucursal', Empresa_SucursalController.actualizarSucursal)
router.delete('/cambiarStatus/:id_empresaSucursal', Empresa_SucursalController.cambiarStatus)
export default router;