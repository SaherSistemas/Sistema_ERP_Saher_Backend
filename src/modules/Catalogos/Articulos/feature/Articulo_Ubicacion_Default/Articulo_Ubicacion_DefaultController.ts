import { Request, Response } from "express";
import { AuthedRequest } from "../../../../../middleware/auth";
import { Articulo_Ubicacion_DefaultServices } from "./Articulo_Ubicacion_Default.service";

export const Articulo_Ubicacion_DefaultController = {
    getByIDArticulo: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.query.id_empresa_sucursal || req.user?.id_empresa || "");
            const { id_articulo } = req.params;

            if (!id_empresa_sucursal) res.status(400).json({ message: "id_empresa_sucursal requerido" });
            if (!id_articulo) res.status(400).json({ message: "id_articulo requerido" });

            const data = await Articulo_Ubicacion_DefaultServices.getByIDArticulo(id_empresa_sucursal, id_articulo);
            // console.log(data)
            res.status(200).json(data);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },
    actualizarOCrear: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.query.id_empresa_sucursal || req.user?.id_empresa || "");
            const { id_articulo } = req.params;
            console.log(req.params)
            if (!id_empresa_sucursal) res.status(400).json({ message: "id_empresa_sucursal requerido" });
            if (!id_articulo) res.status(400).json({ message: "id_articulo requerido" });
            // console.log(id_articulo)
            // console.log("HOLA DESDE EL BACKEND")
            //console.log(req.body)
            const data = await Articulo_Ubicacion_DefaultServices.actualizarOCrearDefaultArticulOUbicacion(id_empresa_sucursal, id_articulo, req.body.id_ubicacion_sucursal);
            // console.log(data)
            res.status(200).json(data);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },
    getByIDArticuloConExistencia: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.query.id_empresa_sucursal || req.user?.id_empresa || "");
            const { id_articulo } = req.params;

            if (!id_empresa_sucursal) res.status(400).json({ message: "id_empresa_sucursal requerido" });
            if (!id_articulo) res.status(400).json({ message: "id_articulo requerido" });

            const data = await Articulo_Ubicacion_DefaultServices.getByIDArticuloConExistencia(id_empresa_sucursal, id_articulo);
            // console.log(data)
            res.status(200).json(data);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },

};
