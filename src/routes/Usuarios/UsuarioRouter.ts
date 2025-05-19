import { Router } from "express";
import { UsuarioController } from "../../controllers/Usuarios/UsuarioController";
const router = Router()

router.post('/crearUsuario', UsuarioController.createUsuario);
router.post('/iniciarSesion', UsuarioController.iniciarSesion)

export default router;