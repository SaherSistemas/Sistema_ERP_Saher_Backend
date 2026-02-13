import { Request, Response } from "express";
import { Ubicacion_SucursalService } from "../../../Almacen/Ubicaciones/services/Ubicacion_Sucursal.service";
import { AuthedRequest } from "../../../../middleware/auth";
import { Articulo_Ubicacion_DefaultServices } from "../services/Articulo_Ubicacion_Default.service";

export const Articulo_Ubicacion_DefaultController = {
    getByIDArticulo: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || String(req.query.id_empresa || "");
            const { id_articulo } = req.params;
            //  console.log(id_empresa_sucursal, id_articulo)
            const data = await Articulo_Ubicacion_DefaultServices.getByIDArticulo(id_empresa_sucursal, id_articulo);
            res.status(200).json({ mensaje: data });
        }
        catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },
};
