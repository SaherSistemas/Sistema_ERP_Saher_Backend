import type { Request, Response } from "express";
import { Detalle_Compra_NegadosService } from "../../services/Compras/Detalle_Compra_Negado.service";

export class Detalle_Compra_NegadoController {
    static createDetalleCompraNegados = async (req: Request, res: Response) => {
        try {
            const { id_comp, productosNegados } = req.body;
            const detalleCompraNegados = await Detalle_Compra_NegadosService.createDetalleCompraNegados(id_comp, productosNegados);
            res.status(201).json({ mensaje: "Detalles de compra negados creados correctamente.", detalleCompraNegados });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear los detalles de compra negados." });
        }
    }
    static recuperadoTrue = async (req: Request, res: Response) => {
        try {
            const { id_detcompneg } = req.params;
            await Detalle_Compra_NegadosService.recuperadoTrue(id_detcompneg)
            res.status(200).json({ mensaje: "Se actualizo correctamente" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear los detalles de compra negados." });

        }
    }
}
