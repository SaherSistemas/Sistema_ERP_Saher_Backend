import type { Request, Response } from "express";
import { PermisoRolService } from "../../services/Usuarios/Permiso_Rol.service"
import { ICreateOrUpdatePermisoRol } from "../../interface/Usuarios/Permiso_Rol.interface";

export class PermisoRolController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPermisosRol = await PermisoRolService.getAll();
            res.status(201).json({ mensaje: todosPermisosRol })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al obtener todos los permisos-rol" })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_rol_permiso } = req.params;
            const rol = await PermisoRolService.getByID(id_rol_permiso)
            res.status(201).json(rol)
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: error.message })
        }
    }

    static getAllRolbyPermiso = async (req: Request, res: Response) =>{
        try {
            const {id_permiso} = req.params;
            const rol = await PermisoRolService.getAllRolbyPermiso(Number(id_permiso));
            res.status(200).json(rol);
            
        } catch (error) {
            console.error(error);
            res.status(404).json({ message: error.message });
        }
    }

    static crear = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newPermisoRol = await PermisoRolService.create(data)
            res.status(201).json({ mensaje: "Permiso rol creado correctamente.", rol: newPermisoRol })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error no se pudo crear el permiso rol." })
        }
    }
    static update = async (req: Request, res: Response) => {
        try {
            const { id_rol_permiso } = req.params;
            const data: ICreateOrUpdatePermisoRol = req.body;
            const update = await PermisoRolService.update(id_rol_permiso, data)
            res.status(201).json({ mensaje: "Permiso actualizado correctamente", id_permiso: update })
        } catch (error) {
            console.error(error)
            res.status(500).json({ mensaje: "Error no se pudo actualizar el permiso." })
        }
    }

}