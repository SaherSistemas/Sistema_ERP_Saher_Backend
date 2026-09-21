import type { Request, Response } from "express";
import type { AuthedRequest } from "../../../../middleware/auth";

import { Detalle_CompraService } from "../services/Detalle_Compra.service";
export class Detalle_Compra_SolicitadoController {
    static getAllArticulosPorCompra = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const todosLosArticulos = await Detalle_CompraService.getAllArticulosPorCompra(id_comp);
            // console.log("ARTICULOS EN CONTROLLER", todosLosArticulos);
            res.status(200).json({ mensaje: todosLosArticulos })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todos los articulos de la compra." })
        }
    }
    static actualizarCantidad = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_detcompsol } = req.params;
            const r = await Detalle_CompraService.actualizarCantidad(
                id_detcompsol, Number(req.body?.cantidad), req.user?.id_referencia_persona ?? null);
            res.status(200).json(r);
        } catch (error: any) {
            console.error('Error en actualizarCantidad:', error.message);
            res.status(400).json({ message: error.message });
        }
    };
    static deleteDetalleCompra = async (req: Request, res: Response) => {
        try {
            const { id_detcompsol } = req.params;
            const resultado = await Detalle_CompraService.deleteDetalleCompra(id_detcompsol);
            res.status(200).json(resultado);
        } catch (error: any) {
            console.error('Error en deleteDetalleCompra:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

}