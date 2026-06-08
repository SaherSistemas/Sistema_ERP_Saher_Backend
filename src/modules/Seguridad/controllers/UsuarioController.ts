import type { Request, Response } from "express";
import { UsuarioService } from "../services/Usuario.service";
import { UsuarioRepository } from "../repositories/Usuario.repository";
import { Usuario_SucursalRepository } from "../repositories/Usuario_Sucursal.repository";
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

    // PATCH /usuario/:id_user/rol
    // Body: { idrol_user: number }
    static cambiarRol = async (req: Request, res: Response) => {
        try {
            const { id_user } = req.params;
            const { idrol_user } = req.body as { idrol_user: number };
            if (!idrol_user) {
                res.status(400).json({ message: 'idrol_user es requerido.' });
                return;
            }
            await UsuarioRepository.updateRol(id_user, idrol_user);
            res.status(200).json({ mensaje: 'Rol del usuario actualizado correctamente.' });
        } catch (error: any) {
            res.status(500).json({ message: error.message ?? 'Error al cambiar el rol.' });
        }
    }

    // GET /usuario/empresas/todas
    static getAllEmpresas = async (_req: Request, res: Response) => {
        try {
            const empresas = await Usuario_SucursalRepository.getAllEmpresas();
            res.status(200).json(empresas);
        } catch (error: any) {
            res.status(500).json({ message: error.message ?? 'Error al obtener empresas.' });
        }
    }

    // GET /usuario/:id_user/empresas
    static getEmpresasUsuario = async (req: Request, res: Response) => {
        try {
            const { id_user } = req.params;
            const empresas = await Usuario_SucursalRepository.getEmpresasPermitidasUsuario(id_user);
            res.status(200).json(empresas);
        } catch (error: any) {
            res.status(500).json({ message: error.message ?? 'Error al obtener empresas del usuario.' });
        }
    }

    // POST /usuario/:id_user/empresas/bulk
    // Body: { id_empresas: string[] }
    static bulkSetEmpresas = async (req: Request, res: Response) => {
        try {
            const { id_user } = req.params;
            const { id_empresas } = req.body as { id_empresas: string[] };
            if (!Array.isArray(id_empresas)) {
                res.status(400).json({ message: 'id_empresas debe ser un arreglo.' });
                return;
            }
            await Usuario_SucursalRepository.bulkSet(id_user, id_empresas);
            res.status(200).json({ mensaje: 'Empresas del usuario actualizadas correctamente.' });
        } catch (error: any) {
            res.status(500).json({ message: error.message ?? 'Error al actualizar empresas.' });
        }
    }

    // PATCH /usuario/empresa/:id_usuario_empresa/toggle
    // Body: { status_acceso: boolean }
    static toggleAccesoEmpresa = async (req: Request, res: Response) => {
        try {
            const { id_usuario_empresa } = req.params;
            const { status_acceso } = req.body as { status_acceso: boolean };
            const updated = await Usuario_SucursalRepository.toggleAcceso(id_usuario_empresa, status_acceso);
            res.status(200).json(updated);
        } catch (error: any) {
            res.status(500).json({ message: error.message ?? 'Error al cambiar acceso.' });
        }
    }
}