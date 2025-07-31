import { Router } from "express";
import { Grupo_EmpresaController } from "../../controllers/Empresa_Sucursal/Grupo_EmpresaController";
const router = Router();
router.get('/', Grupo_EmpresaController.getAllGrupoEmpresas)
router.get('/:id_grupoEmpresa', Grupo_EmpresaController.getGrupoEmpresaByID)
router.post('/', Grupo_EmpresaController.crearGrupoEmpresa)
router.put('/:id_grupoEmpresa', Grupo_EmpresaController.actualizarGrupoEmpresa)
export default router;