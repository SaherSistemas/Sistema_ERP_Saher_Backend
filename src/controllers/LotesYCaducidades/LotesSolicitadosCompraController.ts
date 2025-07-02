import type { Request, Response } from "express";
import { IDetalleSolicitado } from "../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";
import { LotesSolicitadoCompraService } from "../../services/LoteYCaducidades/LotesSolicitadosCompra.service";
export class LotesRecibidosCompraController {
    static guardarLoteQueVieneEnFactura = async (req: Request<IDetalleSolicitado>, res: Response) => {
        try {
            const data = req.body

            const loteRegistrado = await LotesSolicitadoCompraService.guardarLoteCompraSolicitada(data)
            res.status(201).json({ mensaje: "Lote registrado correctamente.", lote: loteRegistrado })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al crear el lote" })
        }
    }
    static actualizarSucursal = async (req: Request, res: Response) => {

    }




}