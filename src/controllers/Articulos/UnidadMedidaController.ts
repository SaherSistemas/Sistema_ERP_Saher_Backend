import type { Request, Response } from "express";
import { UnidadMedidaService } from "../../services/Articulos/unidadMedida.service";
import { ICrearUnidadMedida } from "../../interface/Articulos/UnidadMedida.interface";

export class UnidadMedidaController {
    static getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const todasLasUnidades = await UnidadMedidaService.getAllUnidadMedida();
            res.status(201).json({ mensaje: todasLasUnidades })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todas las unidades." })
        }
    }

    static create = async (req: Request<{}, {}, ICrearUnidadMedida>, res: Response) => {
        try {
            const data = req.body;
            const newUnidadMedida = await UnidadMedidaService.createUnidadMedida(data);
            res.status(201).json('Unidad de medida creada correctamente.')
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la unidad de medida." });
        }
    }
}