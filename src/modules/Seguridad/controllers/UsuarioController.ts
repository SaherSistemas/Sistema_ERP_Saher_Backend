import type { Request, Response } from "express";
import { UsuarioService } from "../services/Usuario.service";
import Usuario from "../model/Usuario";


export class UsuarioController {
    static getByID = async (req: Request, res: Response) => {
        try {
            const { idrol_user, claveUsuario } = req.query;
            //console.log("HOLA")
            //console.log("📦 Params recibidos por query:", req.query);
            const perfil = await UsuarioService.getByID(String(claveUsuario), String(idrol_user));
            res.status(200).json(perfil);
        } catch (error) {
            console.error("Error al obtener el perfil:", error);
            res.status(500).json({ message: "Error interno del servidor" });
        }

    }

    static getByIDUser = async (req: Request, res: Response) => {
        try {
            const { claveUsuario } = req.query;
            //console.log(claveUsuario)
            //console.log("HOLA")
            //  console.log("📦 Params recibidos por query:", req.query);
            const usuario = await UsuarioService.getByIDUser(String(claveUsuario));
            // console.log(usuario)
            res.status(200).json(usuario);
        } catch (error) {
            console.error("Error al obtener el perfil:", error);
            res.status(500).json({ message: "Error interno del servidor" });
        }

    }
}