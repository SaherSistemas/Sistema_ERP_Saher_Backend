import { Router } from "express";
import { Proveedor_EmpresaController } from '../../controllers/Proveedor/Proveedor_EmpresaController'

const router = Router();

router.get('/proveedor/:id_prove/empresas', Proveedor_EmpresaController.proveedoresDeUnaEmpresa)
router.post('/:id_prove/empresas', Proveedor_EmpresaController.createProveedor_Empresa)

export default router