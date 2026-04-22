import { Router } from "express";
import { AuthController } from "./AuthController";
import { authMiddleware } from "../../../middleware/auth";
const router = Router()


router.post('/crearUsuario', AuthController.createUsuario);
router.post('/iniciarSesion', AuthController.iniciarSesion);
router.post('/prelogin/empresas', AuthController.preloginEmpresas)
router.patch('/cambiarContrasena/:usuarioweb', AuthController.cambiarContrasena)
router.get('/user', AuthController.user)
router.get('/mis-permisos-menu', authMiddleware, AuthController.misPermisosMenu)
export default router;