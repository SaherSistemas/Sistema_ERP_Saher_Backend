import type { Request, Response } from "express";
import { Proyeccion_VentaService } from "../../services/PROYECCIONES/Proyeccion_Venta.service";

export class Proyeccion_VentaController {
    static getProyeccionVenta = async (req: Request, res: Response) => {
        try {
            const kardex = await Proyeccion_VentaService.getProyeccionVenta();
            res.status(200).json({ mensaje: kardex })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los kardex." });
        }
    }
}