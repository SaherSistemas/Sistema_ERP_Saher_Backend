import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController";
const router = Router()

router.get('/perfil', UsuarioController.getByID)
//router.get('/obtenerEmpresas', UsuarioController.getEmpresaPermitidaByUser)
router.get('/user', UsuarioController.getByIDUser)
//router.post('/crearUsuario', UsuarioController.createUsuario);
//router.post('/iniciarSesion', UsuarioController.iniciarSesion)

export default router;