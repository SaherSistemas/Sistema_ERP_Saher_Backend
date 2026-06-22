import type { Request, Response } from "express";
import { Proyeccion_VentaService } from "../../services/Proyecciones/Proyeccion_Venta.service";

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
    static getProyeccionVentaPruebas = async (req: Request, res: Response) => {
        try {
            const { cod_int_artic, ventana_dias } = req.params;
            const ids_empresas = Array.isArray(req.body) ? req.body : []; // ej. [2,3,4]

            // console.log(cod_int_artic, ventana_dias, ids_empresas);
            const proyeccionVenta = await Proyeccion_VentaService.getProyeccionVentaPrueba(
                ids_empresas,
                cod_int_artic,
                Number(ventana_dias)
            );
            // console.log(JSON.stringify(proyeccionVenta, null, 2));
            res.status(200).json(proyeccionVenta);
            //res.status(200).json({ message: "Ruta de pruebas exitosa." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proyeccionVenta." });
        }
    };
}