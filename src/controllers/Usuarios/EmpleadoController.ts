import type { Request, Response } from "express";
import { EmpleadoService } from "../../services/Usuarios/Empleados.service";
import { ICrearEmpleado, IEmpleado } from "../../interface/Usuarios/Empleado.interface";

export class EmpleadoController {
    static getAllEmpleados = async (req: Request, res: Response) => {
        try {
            const todosEmpleados = await EmpleadoService.getAllEmpleados();
            res.status(201).json({ mensaje: todosEmpleados })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los empleados" })
        }
    }
    static createEmpleado = async (req: Request<ICrearEmpleado>, res: Response) => {
        try {
            const data = req.body;
            const nuevoEmpleado = await EmpleadoService.createEmpleado(data);
            res.status(201).json('Empleado creado correctamente.')
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear el empleados" })
        }
    }
}