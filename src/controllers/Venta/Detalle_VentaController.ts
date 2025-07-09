import type { Request, Response } from "express";
import {DetalleVentaService} from "../../services/Venta/Detalle_Venta.service"


export class DetalleVentaController  {

    static getAll = async (req: Request, res: Response) => {
            try {
                const cajas = await DetalleVentaService.getAll();
                res.status(200).json(cajas);
            } catch (error) {
                console.error(error);
                res.status(500).json({ mensaje: "Error al encontrar todos Detalle de Ventas." });
            }
        }
    
    static getByID = async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const caja = await DetalleVentaService.getById(id);
                res.status(200).json(caja);
            } catch (error) {
                console.error(error);
                res.status(500).json({ mensaje: "Error al encontrar Detalle Venta." });
            }
        }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoLote = await DetalleVentaService.create(data);
            res.status(201).json(nuevoLote);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear Detalle Venta." });
        }
    }

    static update = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const actualizado = await DetalleVentaService.update(id, data);
        res.status(200).json(actualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar Detalle Venta." });
    }
}

 
}
