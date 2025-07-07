import type { Request, Response } from "express";
import { PermisoService } from "../../services/Usuarios/Permiso.service"
import { ICreateOrUpdatePermiso } from "../../interface/Usuarios/Permiso.interface";

export class PermisoController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPermisos = await PermisoService.getAll();
            res.status(201).json({ mensaje: todosPermisos })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al obtener todos los permisos" })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_permiso } = req.params;
            const rol = await PermisoService.getByID(id_permiso)
            res.status(201).json(rol)
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: error.message })
        }
    }

    static crear = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newRol = await PermisoService.create(data)
            res.status(201).json({ mensaje: "Permiso creado correctamente.", rol: newRol })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error no se pudo crear el permiso." })
        }
    }
    static update = async (req: Request, res: Response) => {
        try {
            const { id_permiso } = req.params;
            const data: ICreateOrUpdatePermiso = req.body;
            const update = await PermisoService.update(id_permiso, data)
            res.status(201).json({ mensaje: "Permiso actualizado correctamente", id_permiso: update })
        } catch (error) {
            console.error(error)
            res.status(500).json({ mensaje: "Error no se pudo actualizar el permiso." })
        }
    }

}