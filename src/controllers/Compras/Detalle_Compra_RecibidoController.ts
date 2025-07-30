import type { Request, Response } from "express";
import { Detalle_Compra_RecibidoService } from "../../services/Compras/Detalle_Compra_Recibido.service";

export class Detalle_Compra_RecibidoController {
    static createDetalleCompraRecibidos = async (req: Request, res: Response) => {
        try {
            const { id_comp, productosRecibidos } = req.body;
            const detalleCompraRecibidos = await Detalle_Compra_RecibidoService.createDetalleCompraRecibidos(id_comp, productosRecibidos);
            res.status(201).json({ mensaje: "Detalles de compra recibidos creados correctamente.", detalleCompraRecibidos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear los detalles de compra recibidos." });
        }
    }
    static getAllDetallesDeCompraRecibidosDeUnaCompra = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const detallesRecibidos = await Detalle_Compra_RecibidoService.getAllDetallesDeCompraRecibidosDeUnaCompra(id_comp);
            res.status(200).json({ mensaje: "Detalles de compra recibidos obtenidos correctamente.", detallesRecibidos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener los detalles de compra recibidos." });
        }
    }
}
