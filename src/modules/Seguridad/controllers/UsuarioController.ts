import type { Request, Response } from "express";
import { UsuarioService } from "../services/Usuario.service";
import { UsuarioRepository } from "../repositories/Usuario.repository";
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

    static getAll = async (req: Request, res: Response) => {
        try {
            const usuarios = await UsuarioRepository.getAll();
            res.status(200).json(usuarios);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener usuarios" });
        }
    }

    static toggleStatus = async (req: Request, res: Response) => {
        try {
            const { id_user } = req.params;
            const { status } = req.body as { status: boolean };
            await UsuarioRepository.toggleStatus(id_user, status);
            res.status(200).json({ mensaje: `Usuario ${status ? 'activado' : 'desactivado'} correctamente` });
        } catch (error) {
            res.status(500).json({ message: "Error al cambiar el estado del usuario" });
        }
    }
}