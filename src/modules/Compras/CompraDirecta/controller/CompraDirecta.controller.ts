import type { Response } from 'express';
import { CompraDirectaService } from '../service/CompraDirecta.service';
import type { AuthedRequest } from '../../../../middleware/auth';

export const CompraDirectaController = {
    registrar: async (req: AuthedRequest, res: Response) => {
        try {
            const data = req.body;
            if (!data.id_proveedor || !data.id_empresa_sucursal || !data.folio_factura || !data.fecha_emision || !Array.isArray(data.items) || data.items.length === 0) {
                res.status(400).json({ mensaje: 'Faltan campos requeridos (id_proveedor, id_empresa_sucursal, folio_factura, fecha_emision, items).' });
                return;
            }
            // Sobreescribir con el UUID real del empleado desde el JWT
            data.id_empleado_registra = req.user?.id_referencia_persona ?? null;
            const result = await CompraDirectaService.registrar(data);
            res.status(201).json({ mensaje: 'Compra directa registrada exitosamente.', ...result });
        } catch (error: any) {
            console.error('[CompraDirecta.controller] Error:', error);
            res.status(500).json({ mensaje: error?.message ?? 'Error al registrar la compra directa.' });
        }
    },
};
