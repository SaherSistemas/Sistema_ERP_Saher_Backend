import type { Request, Response } from "express";
import { MovimientoCajaService } from "../../services/Caja/Movimiento_Caja.service";

export class MovimientoCajaController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const movimientosCaja = await MovimientoCajaService.getAll();
            res.status(200).json(movimientosCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todos los movimientos de caja." });
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_movimiento } = req.params;
            const movimientoCaja = await MovimientoCajaService.getByIDFlexible(id_movimiento);
            res.status(200).json(movimientoCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar el movimiento de caja." });
        }
    }

    static getAllByCaja = async (req: Request, res: Response) => {
        try {
            const { id_caja } = req.params;
            const movimientosCaja = await MovimientoCajaService.getAllByCaja(id_caja);
            res.status(200).json(movimientosCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar los movimientos de caja por caja." });
        }
    }


    static getAllByCorte = async (req: Request, res: Response) => {
        try {
            const { id_corte } = req.params;
            const movimientosCaja = await MovimientoCajaService.getAllByCorte(id_corte);
            res.status(200).json(movimientosCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar los movimientos de caja por corte." });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoMovimientoCaja = await MovimientoCajaService.createMovimientoCaja(data);
            res.status(201).json(nuevoMovimientoCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear el movimiento de caja." });
        }
    }
    static update = async (req: Request, res: Response) => {
        try {
            const { id_movimiento } = req.params;
            const data = req.body;
            const movimientoCajaActualizado = await MovimientoCajaService.updateMovimientoCaja(id_movimiento, data);
            res.status(200).json(movimientoCajaActualizado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al actualizar el movimiento de caja." });
        }
    }
}
