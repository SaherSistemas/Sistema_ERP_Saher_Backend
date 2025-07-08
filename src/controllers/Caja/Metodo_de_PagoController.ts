import type { Request, Response } from "express";
import { MetodoPagoService } from "../../services/Caja/Metodo_de_Pago.service";

export class MetodoPagoController {
    
    static getAll = async (req: Request, res: Response) => {
        try {
            const metodosPago = await MetodoPagoService.getAll();
            res.status(200).json(metodosPago);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todos los métodos de pago." });
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_metodo_pago } = req.params;
            const metodoPago = await MetodoPagoService.getByIDFlexible(id_metodo_pago);
            res.status(200).json(metodoPago);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar el método de pago." });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoMetodoPago = await MetodoPagoService.createMetodoPago(data);
            res.status(201).json(nuevoMetodoPago);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear el método de pago." });
        }
    }
}