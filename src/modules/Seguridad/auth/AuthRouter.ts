import { Router } from "express";
import { AuthController } from "./AuthController";
const router = Router()


router.post('/crearUsuario', AuthController.createUsuario);
router.post('/iniciarSesion', AuthController.iniciarSesion);
router.post('/prelogin/empresas', AuthController.preloginEmpresas)
router.patch('/cambiarContrasena/:usuarioweb', AuthController.cambiarContrasena)
router.get('/user', AuthController.user)
export default router;