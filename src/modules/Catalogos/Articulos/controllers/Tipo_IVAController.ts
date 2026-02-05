import type { Request, Response } from "express";
import { Tipo_IVAService } from "../services/tipoIVA.service";
import { ICreateOrUpdateTipo_IVA, ITipo_IVA } from "../interface/Tipo_IVA.interface";

export class Tipo_IVAController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosTipoIVA = await Tipo_IVAService.getAll();
            res.status(200).json({ mensaje: todosTipoIVA });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener los IVAS." })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const crearNewTipoIVA = await Tipo_IVAService.createTipoIVA(data);
            res.status(201).json({ mensaje: 'Tipo de IVA creado correctamente.', tipoIVA: crearNewTipoIVA })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al crear el tipo de IVA.' })
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_iva } = req.params;
            const data: ICreateOrUpdateTipo_IVA = req.body;
            const updateIVA = await Tipo_IVAService.updateTipoIVA(Number(id_iva), data)
            res.status(200).json({ mensaje: 'Tipo de IVA actualizado correctamente.', tipoIVA: updateIVA });
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al actualizar el tipo de IVA.' })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_iva } = req.params;
            const iva = await Tipo_IVAService.getByID(Number(id_iva));
            res.status(200).json(iva)
        } catch (error) {
            res.status(500).json({ mensaje: "Error al encontrar el IVA" })
        }
    }
}