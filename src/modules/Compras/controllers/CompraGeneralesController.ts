import type { Request, Response } from "express";

import { CompraGeneralesService } from "../services/Compras.service";

export class ComprasGeneralesController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const { total, compras } = await CompraGeneralesService.getAll(id_empresa, page, limit);
            res.status(200).json({
                mensaje: compras,
                total,
                paginaActual: page,
                totalPaginas: Math.ceil(total / limit)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todas las compras." });
        }
    }




    static getByEmpresaEnCaptura = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params
            const compraEnCaptura = await CompraGeneralesService.getEnCaptura(id_empresa)
            res.status(200).json(compraEnCaptura)
        } catch (error) {

        }
    }


    static finalizarCapturaCompraGenYCompraProv = async (req: Request, res: Response) => {
        try {
            const { id_empresa_sucursal } = req.params;
            const { id_empleado_finaliza } = req.body;
            const modificarCompras = await CompraGeneralesService.finalizarCapturaCompraGenYCompraProv(id_empresa_sucursal, id_empleado_finaliza)
            res.status(200).json({ mensaje: "Compra finalizada" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al finalizar la compra" })
        }
    }


}