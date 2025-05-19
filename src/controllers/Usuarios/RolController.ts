import type { Request, Response } from "express";
import { RolService } from "../../services/Usuarios/Rol.service";
import { ICreateOrUpdateRol } from "../../interface/Usuarios/Rol.interface";

export class RolController {
    static getAllRol = async (req: Request, res: Response) => {
        try {
            const todosRoles = await RolService.getAllRol();
            res.status(201).json({ mensaje: todosRoles })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al obtener todos los roles" })
        }
    }

    static getRolByID = async (req: Request, res: Response) => {
        try {
            const { id_rol } = req.params;
            const rol = await RolService.getRolByID(id_rol)
            res.status(201).json(rol)
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message })
        }
    }

    static crearRol = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newRol = await RolService.createRol(data)
            res.status(201).json({ mensaje: "Rol creado correctamente.", rol: newRol })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "Error no se pudo crear el rol." })
        }
    }
    static updateRol = async (req: Request, res: Response) => {
        try {
            const { id_rol } = req.params;
            const data: ICreateOrUpdateRol = req.body;
            const updateRol = await RolService.updateRol(id_rol, data)
            res.status(201).json({ mensaje: "Rol actualizado correctamente", rol: updateRol })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ mensaje: "Error no se pudo actualizar el rol." })
        }
    }

}