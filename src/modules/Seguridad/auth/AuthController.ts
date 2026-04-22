import type { Request, Response } from "express";
import { AuthService } from "./Auth.service";
import jwt from "jsonwebtoken";
import { ICambiarContrasena } from "./Auth.interface";
import { AuthedRequest } from "../../../middleware/auth";
export class AuthController {
    static createUsuario = async (req: Request, res: Response) => {
        try {
            const usuario = await AuthService.createEmpleado(req.body)
            res.status(201).json({
                mensaje: "Usuario creado exitosamente",
                usuario: usuario
            });
        } catch (error) {
            console.log(error)
            res.status(500).json({ mensaje: error.message })
        }
    }
    static iniciarSesion = async (req: Request, res: Response) => {
        try {
            //  console.log(req.body)
            const loginUser = await AuthService.iniciarSesion(req.body);
            // console.log(loginUser)
            res.status(201).json({
                mensaje: "Inicio de sesión exitoso",
                usuario: loginUser
            });
        } catch (error: any) {
            console.error(error);
            res.status(401).json({
                mensaje: error.message || "Error al iniciar sesión"
            });
        }
    }
    static cambiarContrasena = async (req: Request, res: Response) => {
        try {
            const { usuarioweb } = req.params;
            const { contrawebNueva } = req.body;
            const iCambiarContra: ICambiarContrasena = {
                usuarioweb,
                contrawebNueva
            }
            const cambioContra = await AuthService.cambiarContra(iCambiarContra)
            res.status(200).json({
                mensaje: "Contraseña actualizada exitosamente",
                usuario: cambioContra
            });
        } catch (error) {
            //console.error(error);
            res.status(401).json({
                mensaje: error.message || "Error al iniciar sesión"
            });
        }


    }

    static preloginEmpresas = async (req: Request, res: Response) => {
        try {
            //   console.log(req.body)
            const preloginUser = await AuthService.preloginEmpresas(req.body);
            res.status(200).json(preloginUser)
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Token no validssso' })
        }

    }
    static misPermisosMenu = async (req: AuthedRequest, res: Response) => {
        try {
            const id_user = req.user!.id_user;
            const permisos = await AuthService.getMisPermisosMenu(id_user);
            res.status(200).json({ permisos });
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    }

    static user = async (req: Request, res: Response) => {
        const bearer = req.headers.authorization

        if (!bearer) {
            res.status(403).json({ mensaje: "No autorizado" })
            return
        }
        const [, token] = bearer.split(" ")
        //  console.log(token)
        if (!token) {
            res.status(403).json({ mensaje: "Token no validsssso." })

            return

        }

        try {
            const usuario = await AuthService.user(token)
            //    console.log(usuario)
            res.status(200).json({ usuario })
        } catch (error) {
            // console.log(error)
            res.status(500).json({ error: 'Token no validssso' })
        }

    }

}