import type { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { DevolucionProveedorService } from '../services/DevolucionProveedor.service';

const responder = (res: Response, err: any, defecto: string) => {
    console.error('[DevolucionProveedor]', err);
    if (err?.expose) { res.status(err.status ?? 400).json({ message: err.message }); return; }
    res.status(500).json({ message: err?.message ?? defecto });
};

export class DevolucionProveedorController {

    // GET /api/finanzas/cxp/devolucion-proveedor/factura/:id_factura  → lo que se puede devolver de esa factura
    static elegibles = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await DevolucionProveedorService.elegibles(req.params.id_factura, String(req.user?.id_empresa ?? '')));
        } catch (err) { responder(res, err, 'No se pudo consultar la factura.'); }
    };

    // POST /api/finanzas/cxp/devolucion-proveedor   { id_factura_proveedor, motivo, observaciones?, lineas:[{id_detalle, numero_lote, cantidad}] }
    static crear = async (req: AuthedRequest, res: Response) => {
        try {
            const b = req.body ?? {};
            const r = await DevolucionProveedorService.crear({
                id_factura_proveedor: b.id_factura_proveedor,
                motivo: b.motivo,
                observaciones: b.observaciones ?? null,
                lineas: Array.isArray(b.lineas) ? b.lineas : [],
                id_empresa: String(req.user?.id_empresa ?? ''),
                id_empleado: req.user?.id_referencia_persona ?? null,
                usuario: (req.user as any)?.nombre_completo ?? (req.user as any)?.username ?? null,
            });
            res.status(201).json(r);
        } catch (err) { responder(res, err, 'No se pudo crear la devolución.'); }
    };

    // GET /api/finanzas/cxp/devolucion-proveedor/factura/:id_factura/historial
    static historial = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await DevolucionProveedorService.historialPorFactura(req.params.id_factura));
        } catch (err) { responder(res, err, 'No se pudo consultar el historial.'); }
    };

    // GET /api/finanzas/cxp/devolucion-proveedor?fecha_inicio=&fecha_fin=&q=&motivo=&page=
    static listar = async (req: AuthedRequest, res: Response) => {
        try {
            const q = req.query as Record<string, string>;
            res.status(200).json(await DevolucionProveedorService.listar({
                fecha_inicio: q.fecha_inicio || undefined, fecha_fin: q.fecha_fin || undefined,
                q: q.q, motivo: q.motivo || undefined, page: Number(q.page) || 1, limit: Number(q.limit) || 50,
            }));
        } catch (err) { responder(res, err, 'No se pudieron consultar las devoluciones.'); }
    };

    // GET /api/finanzas/cxp/devolucion-proveedor/:id
    static detalle = async (req: AuthedRequest, res: Response) => {
        try { res.status(200).json(await DevolucionProveedorService.detalle(req.params.id)); }
        catch (err) { responder(res, err, 'No se pudo consultar la devolución.'); }
    };

    // POST /api/finanzas/cxp/devolucion-proveedor/:id/imprimir
    static reimprimir = async (req: AuthedRequest, res: Response) => {
        try { res.status(200).json(await DevolucionProveedorService.reimprimir(req.params.id, String(req.user?.id_empresa ?? ''))); }
        catch (err) { responder(res, err, 'No se pudo mandar a imprimir.'); }
    };

    // GET /api/finanzas/cxp/devolucion-proveedor/:id/pdf
    static pdf = async (req: AuthedRequest, res: Response) => {
        try {
            const buffer = await DevolucionProveedorService.pdf(req.params.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="devolucion-proveedor.pdf"`);
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (err) { responder(res, err, 'No se pudo generar el PDF.'); }
    };
}
