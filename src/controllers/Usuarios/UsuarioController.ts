import type { Request, Response } from "express";
import { UsuarioService } from "../../services/Usuarios/Usuario.service";

export class UsuarioController {
    static createUsuario = async (req: Request, res: Response) => {
        try {
            const usuario = await UsuarioService.createEmpleado(req.body)
            res.status(201).json({
                mensaje: "Usuario creado exitosamente",
                usuario: usuario
            });
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: error.message })
        }
    }
    static iniciarSesion = async (req: Request, res: Response) => {
        try {
            const loginUser = await UsuarioService.iniciarSesion(req.body);

            res.status(201).json({
                mensaje: "Inicio de sesión exitoso",
                usuario: loginUser
            });
        } catch (error: any) {
            // console.error(error);
            res.status(401).json({
                mensaje: error.message || "Error al iniciar sesión"
            });
        }
    }

}