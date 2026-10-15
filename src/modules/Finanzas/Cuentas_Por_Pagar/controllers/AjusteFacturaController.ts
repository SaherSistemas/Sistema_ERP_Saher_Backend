import type { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { AjusteFacturaService } from '../services/AjusteFactura.service';

export class AjusteFacturaController {

    // GET /api/finanzas/cxp/ajuste-factura/:id_factura
    static listar = async (req: AuthedRequest, res: Response) => {
        try {
            const ajustes = await AjusteFacturaService.listar(req.params.id_factura);
            res.status(200).json(ajustes);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    };

    // POST /api/finanzas/cxp/ajuste-factura   { id_factura_proveedor, monto, comentario }
    static crear = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura_proveedor, monto, comentario } = req.body ?? {};
            const r = await AjusteFacturaService.crear({
                id_factura_proveedor,
                monto: Number(monto),
                comentario,
                id_empleado: req.user?.id_referencia_persona ?? null,
                usuario: (req.user as any)?.username ?? null,
            });
            res.status(201).json(r);
        } catch (err: any) {
            const status = /obligatorio|distinto de cero|Falta/i.test(err.message) ? 400
                : /no encontrada/i.test(err.message) ? 404 : 500;
            res.status(status).json({ message: err.message });
        }
    };
}
