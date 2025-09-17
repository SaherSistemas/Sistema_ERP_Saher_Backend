import type { Request, Response } from "express";
import { Proyeccion_VentaService } from "../../services/Proyeccion/Proyeccion_Venta.service";

export class Proyeccion_VentaController {
    static getProyeccionVenta = async (req: Request, res: Response) => {
        try {
            const { id_artic, ventana_dias } = req.params;
            const ids_empresas = req.body

            const proyeccionVenta = await Proyeccion_VentaService.getProyeccionVenta(ids_empresas, id_artic, Number(ventana_dias));
            //  console.log(proyeccionVenta)
            res.status(200).json(proyeccionVenta)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proyeccionVenta." });
        }
    }
}