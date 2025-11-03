import { Router } from "express";
import { AuthController } from "../../controllers/Usuarios/AuthController";
const router = Router()

router.post('/crearUsuario', AuthController.createUsuario);
router.post('/iniciarSesion', AuthController.iniciarSesion)
router.patch('/cambiarContrasena/:usuarioweb', AuthController.cambiarContrasena)
router.get('/user', AuthController.user)
export default router;