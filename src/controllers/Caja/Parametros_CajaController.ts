import type { Request, Response } from "express";
import { ParametroCajaService } from "../../services/Caja/Parametro_Caja.service";

export class ParametroCajaController{
    static getAll = async (req: Request, res: Response) => {
        try {
            const parametros = await ParametroCajaService.getAll();
            res.status(200).json(parametros);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todos los parametros de caja." });
        }
    }
    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_parametro_caja } = req.params;
            const parametro = await ParametroCajaService.getByID(id_parametro_caja);
            res.status(200).json(parametro);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar el parametro de caja." });
        }
    }
    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoParametro = await ParametroCajaService.create(data);
            res.status(201).json(nuevoParametro);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear el parametro de caja." });
        }
    }
    static update = async (req: Request, res: Response) => {
        try {
            const { id_parametro_caja } = req.params;
            const data = req.body;
            const parametroActualizado = await ParametroCajaService.update(id_parametro_caja, data);
            res.status(200).json(parametroActualizado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al actualizar el parametro de caja." });
        }
    }
}