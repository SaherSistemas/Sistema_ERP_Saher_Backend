import type { Request, Response } from "express";

import { CompraService } from "../../services/Compras/Compras.service";
import { ICreateCompraProveedorYDetalleCompraSolicitado } from "../../interface/Compras/Compra_Proveedor.interface";


export class ComprasController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const todosLasCompras = await CompraService.getAll(id_empresa);
            res.status(200).json({ mensaje: todosLasCompras })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todas las compras." })
        }
    }
    static createCompra = async (req: Request, res: Response) => {
        try {
            const data: ICreateCompraProveedorYDetalleCompraSolicitado = req.body
            const newCompra = await CompraService.createCompra(data)
            res.status(201).json({ mensaje: "Compra creada correctamente.", compra: newCompra })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la compra" })
        }
    }
}