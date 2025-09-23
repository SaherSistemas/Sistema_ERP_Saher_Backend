import { Request, Response } from "express";
import { DevolucionesService } from "../../services/Devoluciones_NC/Devoluciones.service";

export class DevolucionController {
    static getArticulosDeDevolucionPorID = async (req: Request, res: Response) => {
        try {
            const listas = await DevolucionesService.getAllProductosDevolucion(req.params.id_comp);
            res.status(200).json(listas);
        } catch (error) {
          //  console.log(error)
            res.status(500).json({ message: "Error al obtener las devoluciones", error });
        }
    };


}

