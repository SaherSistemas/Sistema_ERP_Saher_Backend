import type { Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import { UtilidadService } from '../services/Utilidad.service';

const responder = (res: Response, error: any, mensajePorDefecto: string) => {
    console.error('[Utilidad]', error?.message ?? error);
    res.status(error?.status ?? 500).json({ message: error?.message ?? mensajePorDefecto });
};

export class UtilidadController {
    // GET /finanzas/utilidad/resumen?mes=AAAA-MM
    static resumen = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadService.resumenMes(String(req.query.mes ?? '')));
        } catch (e: any) { responder(res, e, 'No se pudo calcular la utilidad del mes.'); }
    };

    // GET /finanzas/utilidad/detalle?mes=AAAA-MM&id_agente=<uuid | sin>   (sin id_agente = todos)
    static detalle = async (req: AuthedRequest, res: Response) => {
        try {
            const idAgente = req.query.id_agente ? String(req.query.id_agente) : undefined;
            res.status(200).json(await UtilidadService.detalleMes(String(req.query.mes ?? ''), idAgente));
        } catch (e: any) { responder(res, e, 'No se pudo calcular el detalle.'); }
    };

    // GET /finanzas/utilidad/pedido/:id_pedido  →  el pedido renglón por renglón
    static pedido = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadService.detallePedido(req.params.id_pedido));
        } catch (e: any) { responder(res, e, 'No se pudo calcular el pedido.'); }
    };

    // GET /finanzas/utilidad/anual?anio=2026
    static anual = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadService.resumenAnual(Number(req.query.anio)));
        } catch (e: any) { responder(res, e, 'No se pudo calcular la utilidad del año.'); }
    };

    // POST /finanzas/utilidad/gastos
    static crearGasto = async (req: AuthedRequest, res: Response) => {
        try {
            const g = await UtilidadService.crearGasto(req.body ?? {}, req.user?.nombre_completo ?? req.user?.username);
            res.status(201).json(g);
        } catch (e: any) { responder(res, e, 'No se pudo guardar el gasto.'); }
    };

    // PUT /finanzas/utilidad/gastos/:id
    static actualizarGasto = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadService.actualizarGasto(req.params.id, req.body ?? {}));
        } catch (e: any) { responder(res, e, 'No se pudo actualizar el gasto.'); }
    };

    // DELETE /finanzas/utilidad/gastos/:id
    static eliminarGasto = async (req: AuthedRequest, res: Response) => {
        try {
            await UtilidadService.eliminarGasto(req.params.id);
            res.status(200).json({ ok: true });
        } catch (e: any) { responder(res, e, 'No se pudo eliminar el gasto.'); }
    };

    // POST /finanzas/utilidad/gastos/copiar  body: { desde: 'AAAA-MM', hacia: 'AAAA-MM' }
    static copiarGastos = async (req: AuthedRequest, res: Response) => {
        try {
            const r = await UtilidadService.copiarGastos(String(req.body?.desde ?? ''), String(req.body?.hacia ?? ''), req.user?.nombre_completo ?? req.user?.username);
            res.status(200).json(r);
        } catch (e: any) { responder(res, e, 'No se pudieron copiar los gastos.'); }
    };
}
