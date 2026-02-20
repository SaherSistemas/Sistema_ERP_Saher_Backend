import { Request, Response } from "express";
import { AuthedRequest } from "../../../../middleware/auth";
import { AcomodoServices } from "../services/Acomodo.service";

export const AcomodoController = {
    getArticulosPendientes: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.user?.id_empresa || req.query.id_empresa_sucursal || "");
            const cb = String(req.query.cb || "").trim();

            const listado_pendientes = await AcomodoServices.obtenerPendientesAcomodo(id_empresa_sucursal, cb);

            res.status(200).json(listado_pendientes);
        } catch (e: any) {
            console.error(e);
            if (res.headersSent) return;

            res.status(400).json({
                ok: false,
                message: e.message ?? "Error"
            });
        }
    },
    acomodarArticulo: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.user?.id_empresa || req.query.id_empresa_sucursal || "").trim();
            if (!id_empresa_sucursal) {
                res.status(400).json({ ok: false, message: "id_empresa_sucursal requerido" });
            }

            const { id_stock_ubicacion_lote, lineas } = req.body || {};

            const result = await AcomodoServices.acomodarArticulo(id_empresa_sucursal, {
                id_stock_ubicacion_lote,
                lineas,
            });

            res.status(200).json({ ok: true, data: result });
        } catch (e: any) {
            console.error(e);
            res.status(400).json({
                ok: false,
                message: e?.message ?? "Error",
            });
        }
    },
};
