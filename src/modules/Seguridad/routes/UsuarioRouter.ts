import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController";
const router = Router()

router.get('/todos', UsuarioController.getAll)
router.patch('/:id_user/status', UsuarioController.toggleStatus)
router.patch('/:id_user/rol', UsuarioController.cambiarRol)
router.get('/perfil', UsuarioController.getByID)
router.get('/user', UsuarioController.getByIDUser)

// ── Empresas por usuario ──────────────────────────────────────────────────────
router.get('/empresas/todas', UsuarioController.getAllEmpresas)
router.get('/:id_user/empresas', UsuarioController.getEmpresasUsuario)
router.post('/:id_user/empresas/bulk', UsuarioController.bulkSetEmpresas)
router.patch('/empresa/:id_usuario_empresa/toggle', UsuarioController.toggleAccesoEmpresa)

export default router;