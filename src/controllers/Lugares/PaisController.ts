import type { Request, Response } from "express";
import { PaisService } from "../../services/Lugares/pais.service";
import { ICreatePais, IUpdatePais } from "../../interface/Lugares/Pais.interface";

export class PaisController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPaises = await PaisService.getAllPaises();
            res.status(201).json({ mensaje: todosPaises });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener todos los países." });
        }
    }
    static getAllActivos = async (req: Request, res: Response) => {
        try {
            const paisesActivos = await PaisService.getAllPaisesActivos();
            res.status(201).json({ mensaje: paisesActivos })
        } catch (error) {
            res.status(500).json({ message: "Error al obtener todos los países." });
        }
    }

    static create = async (req: Request<{}, {}, ICreatePais>, res: Response) => {
        try {
            const data = req.body;
            const newPais = await PaisService.createPais(data);
            res.status(201).json({ mensaje: 'País creado correctamente', pais: newPais });
        } catch (error: any) {
            // console.error('Error al crear país:', error);
            res.status(500).json({ message: error.message || 'Error desconocido al crear el país.' });
        }
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params;
            const pais = await PaisService.getPaisById(id_pais); // Ya es string
            res.status(200).json(pais);
        } catch (error) {
            // console.error('Error al crear país:', error);
            res.status(500).json({ mensaje: "Error al encontrar el país." });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params;
            const data: IUpdatePais = req.body;
            const updatedPais = await PaisService.updatePais(id_pais, data); // Ya es string
            res.status(201).json({ mensaje: 'País actualizado correctamente.', pais: updatedPais });
        } catch (error) {
            console.log(error)
            res.status(500).json({ mensaje: "Error al modificar el país." });
        }
    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params;
            const updateStatusPais = await PaisService.cambiarStatus(id_pais); // Ya es string
            res.status(201).json({ mensaje: 'Se cambió el estatus del país correctamente.', pais: updateStatusPais });
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    }
}
