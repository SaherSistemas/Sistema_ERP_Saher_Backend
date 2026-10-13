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
    // GET /almacen/acomodo/pendientes-default — lo que está sin ubicación y su ubicación default
    getPendientesConDefault: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.user?.id_empresa || req.query.id_empresa_sucursal || "").trim();
            if (!id_empresa_sucursal) { res.status(400).json({ ok: false, message: "id_empresa_sucursal requerido" }); return; }
            res.status(200).json(await AcomodoServices.pendientesConDefault(id_empresa_sucursal));
        } catch (e: any) {
            console.error(e);
            res.status(400).json({ ok: false, message: e?.message ?? "Error" });
        }
    },

    // POST /almacen/acomodo/acomodar-default  { ids: string[] } — acomoda cada renglón en el default de su artículo
    acomodarEnDefault: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa_sucursal = String(req.user?.id_empresa || req.query.id_empresa_sucursal || "").trim();
            if (!id_empresa_sucursal) { res.status(400).json({ ok: false, message: "id_empresa_sucursal requerido" }); return; }
            const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).map(String) : [];
            const modo = req.body?.modo === 'mayor' ? 'mayor' : 'default';
            res.status(200).json(await AcomodoServices.acomodarEnDefault(id_empresa_sucursal, ids, modo, req.user?.id_referencia_persona));
        } catch (e: any) {
            console.error(e);
            res.status(400).json({ ok: false, message: e?.message ?? "Error" });
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
                id_empleado: req.user?.id_referencia_persona,
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
