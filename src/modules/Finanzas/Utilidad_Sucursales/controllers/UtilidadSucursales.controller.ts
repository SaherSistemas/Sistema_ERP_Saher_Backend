import type { Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import { UtilidadSucursalesService } from '../services/UtilidadSucursales.service';

const responder = (res: Response, error: any, mensajePorDefecto: string) => {
    console.error('[UtilidadSucursales]', error?.message ?? error);
    res.status(error?.status ?? 500).json({ message: error?.message ?? mensajePorDefecto });
};

const empresaDe = (v: any) => (v === undefined || v === null || v === '' ? undefined : Number(v));

export class UtilidadSucursalesController {
    // GET /finanzas/utilidad-sucursales/resumen?mes=AAAA-MM
    static resumen = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.resumenMes(String(req.query.mes ?? '')));
        } catch (e: any) { responder(res, e, 'No se pudo calcular la utilidad del mes.'); }
    };

    // GET /finanzas/utilidad-sucursales/detalle?mes=AAAA-MM&id_empresa=<n>   (sin id_empresa = todas) → días del mes
    static detalle = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.detalleMes(String(req.query.mes ?? ''), empresaDe(req.query.id_empresa)));
        } catch (e: any) { responder(res, e, 'No se pudo calcular el detalle.'); }
    };

    // GET /finanzas/utilidad-sucursales/tickets?fecha=AAAA-MM-DD&id_empresa=<n>  → tickets del día
    static tickets = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.ticketsDelDia(String(req.query.fecha ?? ''), empresaDe(req.query.id_empresa)));
        } catch (e: any) { responder(res, e, 'No se pudieron cargar los tickets.'); }
    };

    // GET /finanzas/utilidad-sucursales/ticket/:clave  →  el ticket renglón por renglón (T-empresa-caja-ticket | D-empresa-devolucion)
    static ticket = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.detalleTicket(req.params.clave));
        } catch (e: any) { responder(res, e, 'No se pudo calcular el ticket.'); }
    };

    // GET /finanzas/utilidad-sucursales/anual?anio=2026
    static anual = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.resumenAnual(Number(req.query.anio)));
        } catch (e: any) { responder(res, e, 'No se pudo calcular la utilidad del año.'); }
    };

    // POST /finanzas/utilidad-sucursales/gastos
    static crearGasto = async (req: AuthedRequest, res: Response) => {
        try {
            const g = await UtilidadSucursalesService.crearGasto(req.body ?? {}, req.user?.nombre_completo ?? req.user?.username);
            res.status(201).json(g);
        } catch (e: any) { responder(res, e, 'No se pudo guardar el gasto.'); }
    };

    // PUT /finanzas/utilidad-sucursales/gastos/:id
    static actualizarGasto = async (req: AuthedRequest, res: Response) => {
        try {
            res.status(200).json(await UtilidadSucursalesService.actualizarGasto(req.params.id, req.body ?? {}));
        } catch (e: any) { responder(res, e, 'No se pudo actualizar el gasto.'); }
    };

    // DELETE /finanzas/utilidad-sucursales/gastos/:id
    static eliminarGasto = async (req: AuthedRequest, res: Response) => {
        try {
            await UtilidadSucursalesService.eliminarGasto(req.params.id);
            res.status(200).json({ ok: true });
        } catch (e: any) { responder(res, e, 'No se pudo eliminar el gasto.'); }
    };

    // POST /finanzas/utilidad-sucursales/gastos/copiar  body: { desde: 'AAAA-MM', hacia: 'AAAA-MM' }
    static copiarGastos = async (req: AuthedRequest, res: Response) => {
        try {
            const r = await UtilidadSucursalesService.copiarGastos(String(req.body?.desde ?? ''), String(req.body?.hacia ?? ''), req.user?.nombre_completo ?? req.user?.username);
            res.status(200).json(r);
        } catch (e: any) { responder(res, e, 'No se pudieron copiar los gastos.'); }
    };
}
