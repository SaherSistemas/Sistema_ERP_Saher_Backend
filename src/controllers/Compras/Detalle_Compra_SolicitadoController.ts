import type { Request, Response } from "express";

import { Detalle_CompraService } from "../../services/Compras/Detalle_Compra.service";
export class Detalle_Compra_SolicitadoController {
    static getAllArticulosPorCompra = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const todosLosArticulos = await Detalle_CompraService.getAllArticulosPorCompra(id_comp);
            res.status(200).json({ mensaje: todosLosArticulos })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todos los articulos de la compra." })
        }
    }

}