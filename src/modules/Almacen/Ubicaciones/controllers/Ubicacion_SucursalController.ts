import { Request, Response } from "express";
import { Ubicacion_SucursalService } from "../services/Ubicacion_Sucursal.service";
import { AuthedRequest } from "../../../../middleware/auth";
const toBool = (v: any) => String(v ?? "") === "1" || String(v ?? "").toLowerCase() === "true";

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
    getAllFiltered: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || String(req.query.id_empresa || "");

            const filters = {
                tipo: req.query.tipo ? String(req.query.tipo) : undefined,
                pasillo: req.query.pasillo ? String(req.query.pasillo) : undefined,
                anaquel: req.query.anaquel ? String(req.query.anaquel) : undefined,
                q: req.query.q ? String(req.query.q) : undefined,
                include_defaults: toBool(req.query.include_defaults),
            };

            const data = await Ubicacion_SucursalService.getAllFiltered(id_empresa_sucursal, filters);
           
            res.status(200).json({ mensaje: data });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },

    getMeta: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || String(req.query.id_empresa || "");
            const data = await Ubicacion_SucursalService.getMeta(id_empresa_sucursal);
            res.status(200).json({ mensaje: data });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message || "Error" });
        }
    },





};
