import type { Request, Response } from "express";
import { Detalle_Compra_RecibidoService } from "../../services/Compras/Detalle_Compra_Recibido.service";

export class Detalle_Compra_RecibidoController {
    static createDetalleCompraRecibidos = async (req: Request, res: Response) => {
        try {
            const { id_comp, productosRecibidos } = req.body;
            const detalleCompraNegados = await Detalle_Compra_RecibidoService.createDetalleCompraRecibidos(id_comp, productosRecibidos);
            res.status(201).json({ mensaje: "Detalles de compra negados creados correctamente.", detalleCompraNegados });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear los detalles de compra negados." });
        }
    }
}
