import { Request, Response } from "express";
import { Ubicacion_SucursalService } from "../services/Ubicacion_Sucursal.service";
import { AuthedRequest } from "../../../../middleware/auth";

export const Ubicacion_ArticuloController = {



    getByIDArticulo: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || String(req.query.id_empresa || "");
            const { id_articulo } = req.params;
            const data = await Ubicacion_SucursalService.getByIDArticulo(id_empresa_sucursal, id_articulo);
            res.status(200).json(data);
        }
        catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },
};
