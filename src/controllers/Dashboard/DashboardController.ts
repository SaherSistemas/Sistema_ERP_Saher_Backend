import type { Request, Response } from "express";
import { ICompraKPISRequest } from "../../interface/Dashboard/Compras.interface";
import { dashboardComprasService } from "../../services/Dashboard/dashboardCompras.service";
import { dashboardOperacionesService } from "../../services/Dashboard/dashboardOperaciones.service";
import { CompraGeneralesService } from "../../modules/Compras/Ordenes-Compra/services/Compras.service";
import { compraProveedorService } from "../../modules/Compras/Ordenes-Compra/services/compraProveedor.service";
import { Op, QueryTypes } from "sequelize";
import { dbLocal } from "../../config/db";

export class Dash_CompraController {
    static getAllKpisCompras = async (req: Request, res: Response) => {
        try {
            const { empresaId } = req.params;
            const requestQuery: ICompraKPISRequest = req.query;
            const getAllKPISCompra = await dashboardComprasService.getAllCompraKPIS(empresaId, requestQuery);
            //console.log(requestQuery.from, requestQuery.to, requestQuery.estadoHijo, requestQuery.q)
            //  console.log("Query:", req.query);
            //console.log(empresaId)


            // console.log(getAllKPISCompra)
            res.status(200).json(getAllKPISCompra);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Error al obtener los KPIs de compras." });
        }
    }

    static getAllComprasConFiltro = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            // from/to en query; si no vienen, se ponen default (1er día del mes y hoy)
            const { from, to } = req.query as { from?: string; to?: string; };
            //  console.log(estadoHijo, q)
            // Defaults (server timezone; si usas TZ, mejor con dayjs.tz/moment-timezone)
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Normaliza a YYYY-MM-DD
            const toYMD = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const fromStr = from?.trim() || toYMD(firstOfMonth);
            const toStr = to?.trim() || toYMD(now);

            // Construye rango con fin del día para incluirlo
            const start = new Date(`${fromStr}T00:00:00.000`);
            const end = new Date(`${toStr}T23:59:59.999`);

            // Llama al service con rango
            // !PUEDEN SER COMPRAS GENERALES O COMPRAS PROVEEDOR DEPENDE LOS FILTROS AHORITA LOS EXPLICO 
            const comprasGeneralesConFiltro = await CompraGeneralesService.getComprasGeneralesConFiltro(
                id_empresa,
                { start, end }
            );
            const comprasPendientes = await compraProveedorService.getComprasPendientes();
            // console.log(comprasGeneralesConFiltro);
            //console.log(comprasPendientes);
            res.status(200).json({ comprasGeneralesConFiltro, comprasPendientes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todas las compras." });
        }
    }

    static buscarPorFolioFactura = async (req: Request, res: Response) => {
        try {
            const { folio } = req.query as { folio?: string };
            if (!folio?.trim()) { res.status(400).json({ message: 'Folio requerido.' }); return; }

            const rows = await dbLocal.query<{
                id_factura_proveedor:    string;
                folio_factura_proveedor: string;
                id_compra_proveedor:     string | null;
                id_compra_general:       string | null;
            }>(`
                SELECT
                    f.id_factura_proveedor,
                    f.folio_factura_proveedor,
                    f.id_compra_prove_factura AS id_compra_proveedor,
                    cp.id_compra_general
                FROM factura_compra_proveedor f
                LEFT JOIN compra_proveedor cp ON cp.id_comp = f.id_compra_prove_factura
                WHERE f.folio_factura_proveedor ILIKE :folio
            `, { type: QueryTypes.SELECT, replacements: { folio: `%${folio.trim()}%` } });

            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al buscar por folio.' });
        }
    };

    static getKpisOperaciones = async (_req: Request, res: Response) => {
        try {
            const data = await dashboardOperacionesService.getKpis();
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener KPIs operacionales.' });
        }
    }

    static getDiasInventario = async (req: Request, res: Response) => {
        try {
            const limite = Number(req.query.limite ?? 30);
            const data = await dashboardOperacionesService.getDiasInventario(limite);
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener días de inventario.' });
        }
    }

    static getPresupuestosAgentes = async (_req: Request, res: Response) => {
        try {
            const data = await dashboardOperacionesService.getPresupuestosAgentes();
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener presupuestos de agentes.' });
        }
    }
}
