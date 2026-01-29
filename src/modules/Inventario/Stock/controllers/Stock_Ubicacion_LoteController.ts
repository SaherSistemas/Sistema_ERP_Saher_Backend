import { Request, Response } from "express";
import { AuthedRequest } from "../../../../middleware/auth";
import { Stock_Ubicacion_LoteService } from "../services/Stock_Ubicacion_Lote.service";

export const Stock_Ubicacion_LoteController = {
    add: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa_sucursal || req.body.id_empresa_sucursal;

            const data = await Stock_Ubicacion_LoteService.addStock({
                ...req.body,
                id_empresa_sucursal,
            });

            res.status(201).json({ mensaje: data });
        } catch (error: any) {
            const msg = String(error?.message || "Error");
            res.status(400).json({ message: msg });
        }
    },

    getByUbicacion: async (req: Request, res: Response) => {
        try {
            const { id_ubicacion_sucursal } = req.params;
            const data = await Stock_Ubicacion_LoteService.getStockByUbicacion(id_ubicacion_sucursal);
            res.status(200).json({ mensaje: data });
        } catch (error: any) {
            res.status(500).json({ message: error?.message || "Error" });
        }
    },
};
