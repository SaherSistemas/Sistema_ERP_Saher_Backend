import type { Request, Response } from 'express';
import { CxCService } from '../services/CxC.service';

export class CxCController {

    // ─── CONSULTAS ────────────────────────────────────────────────────────────

    static getAll = async (req: Request, res: Response) => {
        try {
            const cuentas = await CxCService.getAll();
            res.status(200).json({ cuentas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las cuentas por cobrar.' });
        }
    };

    static getByCliente = async (req: Request, res: Response) => {
        try {
            const { id_cliente_alm } = req.params;
            const cuentas = await CxCService.getByCliente(id_cliente_alm);
            res.status(200).json({ cuentas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener el estado de cuenta del cliente.' });
        }
    };

    static getVencidas = async (req: Request, res: Response) => {
        try {
            const cuentas = await CxCService.getVencidas();
            res.status(200).json({ cuentas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener la cartera vencida.' });
        }
    };

    static getById = async (req: Request, res: Response) => {
        try {
            const { id_cxc } = req.params;
            const resultado = await CxCService.getById(id_cxc);
            res.status(200).json(resultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener la cuenta por cobrar.' });
        }
    };

    // ─── PASO 1 — CAPTURAR PAGO ───────────────────────────────────────────────
    //  Cualquier empleado registra el pago → estatus CAP, no toca el saldo

    static capturarPago = async (req: Request, res: Response) => {
        try {
            const { id_cxc } = req.params;
            const pago = await CxCService.capturarPago({ ...req.body, id_cxc });
            res.status(201).json({
                message: 'Pago capturado. Pendiente de aplicar por el encargado.',
                pago,
            });
        } catch (error: any) {
            console.error(error);
            const status = /no encontrada|pagada|cancelada|excede/.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al capturar el pago.' });
        }
    };

    // ─── PASO 2 — APLICAR PAGO ────────────────────────────────────────────────
    //  El encargado aprueba → actualiza CxC + crea Factura_Pago_CFDI en PEN
    //  (sin timbrar aún — usar /timbrar-pagos para el timbrado en lote)

    static aplicarPago = async (req: Request, res: Response) => {
        try {
            const { id_pago_cxc } = req.params;
            const { id_empleado_aplica } = req.body;
            const resultado = await CxCService.aplicarPago({ id_pago_cxc, id_empleado_aplica });
            res.status(200).json(resultado);
        } catch (error: any) {
            console.error(error);
            const status = /no encontrado|ya fue aplicado|cancelado/.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al aplicar el pago.' });
        }
    };

    // ─── PAGOS PENDIENTES DE APLICAR ─────────────────────────────────────────
    //  Vista del encargado de pagos: todos los pagos en estatus CAP

    static getPagosParaAplicar = async (req: Request, res: Response) => {
        try {
            const pagos = await CxCService.getPagosParaAplicar();
            res.status(200).json({ pagos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener los pagos pendientes.' });
        }
    };

    // ─── TIMBRAR PAGOS EN LOTE ────────────────────────────────────────────────
    //  Toma TODOS los Factura_Pago_CFDI en PEN y los timbra con Facturapi.
    //  Devuelve resumen: cuántos se timbraron, cuántos fallaron y el detalle.

    static timbrarPagosPendientes = async (req: Request, res: Response) => {
        try {
            const resultado = await CxCService.timbrarPagosPendientes();
            const httpStatus = resultado.ok ? 200 : 207; // 207 Multi-Status si hubo errores parciales
            res.status(httpStatus).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al timbrar los pagos.' });
        }
    };

    // ─── MARCAR VENCIDAS (job manual o automático) ────────────────────────────

    static marcarVencidas = async (req: Request, res: Response) => {
        try {
            await CxCService.marcarVencidas();
            res.status(200).json({ message: 'Cuentas vencidas actualizadas.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al marcar cuentas vencidas.' });
        }
    };
}
