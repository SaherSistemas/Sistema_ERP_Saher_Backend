import { Router } from "express";
import { Empresa_SucursalController } from "../../controllers/Empresa_Sucursal/Empresa_SucursalController";

const router = Router();
router.get('/', Empresa_SucursalController.getAllEmpresas)
router.post('/', Empresa_SucursalController.crearEmpresaSucursal)
export default router;