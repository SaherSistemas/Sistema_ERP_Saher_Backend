import type { Request, Response } from "express"
import { EmpleadoService } from "../../services/Usuarios/Empleados.service"
import { IEmpleado } from "../../interface/Usuarios/Empleado.interface"

export class EmpleadoController {
    static getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const todosEmpleados = await EmpleadoService.getAllEmpleados();
            res.status(201).json(todosEmpleados)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los empleados." })
        }
    }
    static createEmpleado = async (req: Request<IEmpleado>, res: Response) => {
        try {
            const data = req.body;
            const newEmpleado = await EmpleadoService.crearEmpleado(data)
            res.status(201).json('Empleado creado correctamente.')
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear el empleado." });
        }

    }
}