import { Request, Response } from "express";
import { NotasCreditoProveedorService } from "../../services/Devoluciones_NC/NotasCreditoProveedor.service";

export class NotasCreditoController {
    static createNotaCredito = async (req: Request, res: Response) => {
        try {
            const nuevaNotaCredito = await NotasCreditoProveedorService.createNotaDeCredito(req.body)
            res.status(200).json(nuevaNotaCredito);
        } catch (error) {
            //  console.log(error)
            res.status(500).json({ message: "Error al obtener las devoluciones", error });
        }
    };


}

