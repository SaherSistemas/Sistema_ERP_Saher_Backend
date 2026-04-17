import type { Request, Response } from 'express';
import { RemisionService } from '../services/Remision.service';

export class RemisionController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const remisiones = await RemisionService.getAll();
            res.status(200).json({ remisiones });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las remisiones.' });
        }
    };

    static getByCliente = async (req: Request, res: Response) => {
        try {
            const { id_cliente } = req.params;
            const remisiones = await RemisionService.getByCliente(id_cliente);
            res.status(200).json({ remisiones });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las remisiones del cliente.' });
        }
    };

    static getByIdConDetalles = async (req: Request, res: Response) => {
        try {
            const { id_remision } = req.params;
            const remision = await RemisionService.getByIdConDetalles(id_remision);
            res.status(200).json({ remision });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener el detalle de la remisión.' });
        }
    };

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const remision = await RemisionService.create(data);
            res.status(201).json({ message: 'Remisión creada correctamente.', remision });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear la remisión.' });
        }
    };
}
