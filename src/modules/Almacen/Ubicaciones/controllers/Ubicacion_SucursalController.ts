import { Request, Response } from "express";
import { Ubicacion_SucursalService } from "../services/Ubicacion_Sucursal.service";
import { AuthedRequest } from "../../../../middleware/auth";

export const Ubicacion_SucursalController = {

    create: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || req.body.id_empresa;

            const data = await Ubicacion_SucursalService.create({
                ...req.body,
                id_empresa_sucursal,
            });

            res.status(201).json({ data });
        } catch (error: any) {
            const msg = String(error?.message || "Error");
            res.status(400).json({ message: msg });
        }
    },
    getAll: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || String(req.query.id_empresa || "");


            const data = await Ubicacion_SucursalService.getAll(id_empresa_sucursal);
            //console.log(data)
            res.status(200).json({ mensaje: data });

        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },






};
