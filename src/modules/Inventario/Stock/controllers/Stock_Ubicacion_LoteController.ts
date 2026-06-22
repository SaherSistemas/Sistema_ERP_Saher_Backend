import { Request, Response } from "express";
import { AuthedRequest } from "../../../../middleware/auth";
import { Stock_Ubicacion_LoteService } from "../services/Stock_Ubicacion_Lote.service";
import { KardexService } from "../../../Almacen/Kardex/services/Kardex.service";

export const Stock_Ubicacion_LoteController = {
    obtenerExistencias: async (req: AuthedRequest, res: Response) => {
        try {

            const id_empresa = String(req.user?.id_empresa || req.query.id_empresa || '').trim();
            const id_articulo = String(req.query.id_articulo || '').trim() || undefined;

            if (!id_empresa) {
                res.status(400).json({ ok: false, message: 'id_empresa requerido' });
                return;
            }

            const resultado = await Stock_Ubicacion_LoteService.obtenerExistencias(id_empresa, id_articulo);
        //    console.log((JSON.stringify(resultado, null, 2)));
            res.status(200).json(resultado);
        }
        catch (e: any) {
            console.error('[KardexController.obtenerExistencias]', e);
            if (res.headersSent) return;
            res.status(400).json({ ok: false, message: e.message ?? 'Error al obtener existencias' });
        }
    },
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

    mover: async (req: Request & { user?: any }, res: Response) => {
        try {
            const id_empresa_sucursal = req.user?.id_empresa || req.body.id_empresa_sucursal;
            const { id_stock_ubicacion_lote, cantidad, id_ubicacion_destino } = req.body;
            if (!id_stock_ubicacion_lote || !cantidad || !id_ubicacion_destino)
                throw new Error("id_stock_ubicacion_lote, cantidad e id_ubicacion_destino son requeridos");

            const result = await Stock_Ubicacion_LoteService.moverStock({
                id_empresa_sucursal,
                id_stock_ubicacion_lote,
                cantidad: Number(cantidad),
                id_ubicacion_destino,
            });
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error?.message || "Error" });
        }
    },
};
