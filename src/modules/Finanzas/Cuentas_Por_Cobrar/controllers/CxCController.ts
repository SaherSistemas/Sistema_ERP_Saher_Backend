import type { Request, Response } from 'express';
import { CxCService } from '../services/CxC.service';
import { AuthedRequest } from '../../../../middleware/auth';

export class CxCController {

    // ─── CLIENTES CON SALDO PENDIENTE + SUS CxC ───────────────────────────────
    // Devuelve todos los clientes que tienen CxC en PEN/PAR/VEN,
    // con el listado de facturas/remisiones pendientes listo para el formulario de pago.

    static getClientesDeudores = async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado = req.user!.id_referencia_persona;
            const clientes = await CxCService.getClientesDeudores(id_empleado);
            res.status(200).json({ clientes });
        } catch (error: any) {
            console.error(error);
            const status = /no se encontró un agente/i.test(error.message) ? 404 : 500;
            res.status(status).json({ message: error.message ?? 'Error al obtener clientes con saldo pendiente.' });
        }
    };

    // ─── REGISTRAR PAGO DE RECIBO (multi-CxC) ────────────────────────────────
    // Un solo recibo físico puede abonar a varias facturas del mismo cliente.
    // Body: { numero_recibo, fecha_deposito, id_metodo_pago, id_forma_pago,
    //         referencia_pago?, id_empleado_captura, notas?,
    //         abonos: [{ id_cxc, monto_abono }] }

    static capturarPagoCliente = async (req: Request, res: Response) => {
        try {
            const { id_cliente_alm } = req.params;
            const resultado = await CxCService.capturarPagoCliente({ ...req.body, id_cliente_alm });
            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            const status = /no encontrada|no pertenece|pagada|cancelada|excede|mayor a 0|al menos un/i.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al registrar el pago.' });
        }
    };

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

    // ─── CFDI POR TIMBRAR ─────────────────────────────────────────────────────
    //  Lista los FacturaPagoCFDI en estatus PEN o ERR (listos para timbrar)

    static getCFDIPorTimbrar = async (req: Request, res: Response) => {
        try {
            const cfdis = await CxCService.getCFDIPorTimbrar();
            res.status(200).json({ cfdis });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener los CFDI pendientes de timbrar.' });
        }
    };

    // ─── MIS RECIBOS (web agente) ─────────────────────────────────────────────
    //  Devuelve los pagos registrados por el empleado autenticado

    static getMisRecibos = async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado = req.user!.id_referencia_persona;
            const pagos = await CxCService.getMisRecibos(id_empleado);
            res.status(200).json({ pagos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener los recibos.' });
        }
    };

    // ─── PAGOS APLICADOS (comisiones) ─────────────────────────────────────────
    // GET /api/cxc/pagos/aplicados
    //   ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD  (opcionales)
    // Devuelve todos los APL con fecha_vencimiento de la CxC incluida para que
    // el frontend pueda calcular comisiones por agente en tiempo real.

    static getPagosAplicados = async (req: Request, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin } = req.query as { fecha_inicio?: string; fecha_fin?: string };
            const pagos = await CxCService.getPagosAplicados({ fecha_inicio, fecha_fin });
            res.status(200).json({ pagos });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al obtener los pagos aplicados.' });
        }
    };

    // ─── PAGOS APL SIN CFDI ───────────────────────────────────────────────────
    static getPagosAplicadosSinCFDI = async (req: Request, res: Response) => {
        try {
            const pagos = await CxCService.getPagosAplicadosSinCFDI();
            res.status(200).json({ pagos });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al obtener pagos sin CFDI.' });
        }
    };

    // ─── TIMBRAR MANUAL ───────────────────────────────────────────────────────
    static timbrarManual = async (req: Request, res: Response) => {
        try {
            const { id_pago_cxc } = req.params;
            const { uuid_sat } = req.body;
            const resultado = await CxCService.timbrarManual(id_pago_cxc, uuid_sat);
            res.status(resultado.timbrado?.ok ? 200 : 207).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al timbrar el pago.' });
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

    // ─── RESUMEN GENERAL (Dashboard) ─────────────────────────────────────────
    // Cartera total, vencida, vigente, pagos pendientes de aplicar y timbrar

    static getResumenGeneral = async (req: Request, res: Response) => {
        try {
            const resumen = await CxCService.getResumenGeneral();
            res.status(200).json(resumen);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener el resumen de cartera.' });
        }
    };

    // ─── ESTADO DE CUENTA POR CLIENTE ────────────────────────────────────────
    // ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD  (opcionales)

    static getEstadoCuenta = async (req: Request, res: Response) => {
        try {
            const { id_cliente_alm } = req.params;
            const { fecha_inicio, fecha_fin } = req.query as { fecha_inicio?: string; fecha_fin?: string };
            const resultado = await CxCService.getEstadoCuenta(id_cliente_alm, { fecha_inicio, fecha_fin });
            res.status(200).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error al obtener el estado de cuenta.' });
        }
    };

    // ─── ANTIGÜEDAD DE SALDOS GLOBAL ─────────────────────────────────────────

    static getAntiguedadSaldos = async (req: Request, res: Response) => {
        try {
            const resultado = await CxCService.getAntiguedadSaldos();
            res.status(200).json(resultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener la antigüedad de saldos.' });
        }
    };

    // ─── ANTIGÜEDAD DE SALDOS POR CLIENTE ────────────────────────────────────

    static getAntiguedadByCliente = async (req: Request, res: Response) => {
        try {
            const { id_cliente_alm } = req.params;
            const resultado = await CxCService.getAntiguedadSaldos(id_cliente_alm);
            res.status(200).json(resultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener la antigüedad de saldos del cliente.' });
        }
    };

    // ─── HISTORIAL DE PAGOS DE UNA CxC ───────────────────────────────────────
    // Incluye datos del CFDI de pago (uuid, PDF, estatus timbrado)

    static getHistorialCxC = async (req: Request, res: Response) => {
        try {
            const { id_cxc } = req.params;
            const resultado = await CxCService.getHistorialCxC(id_cxc);
            res.status(200).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error al obtener el historial.' });
        }
    };

    // ─── EDITAR PAGO CAP ─────────────────────────────────────────────────────
    // Permite modificar monto, fecha, forma/método de pago, referencia y notas
    // mientras el pago no haya sido aplicado (estatus CAP)

    static editarPago = async (req: Request, res: Response) => {
        try {
            const { id_pago_cxc } = req.params;
            const resultado = await CxCService.editarPago(id_pago_cxc, req.body);
            res.status(200).json({ message: 'Pago actualizado correctamente.', pago: resultado });
        } catch (error: any) {
            console.error(error);
            const status = /no encontrado|no está en estatus CAP|excede|mayor a 0/.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al editar el pago.' });
        }
    };

    // ─── RECIBO DE COBRANZA PDF ───────────────────────────────────────────────
    // GET /api/cxc/recibo/:numero_recibo/pdf
    // Devuelve el PDF del recibo como stream inline (application/pdf).

    static getReciboPDF = async (req: Request, res: Response) => {
        try {
            const { numero_recibo } = req.params;
            const buffer = await CxCService.generarReciboPDF(numero_recibo);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="recibo-${numero_recibo}.pdf"`);
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (error: any) {
            console.error(error);
            const status = /no encontrado/i.test(error.message) ? 404 : 500;
            res.status(status).json({ message: error.message ?? 'Error al generar el recibo PDF.' });
        }
    };

    // ─── CANCELAR PAGO ────────────────────────────────────────────────────────
    // Solo aplica a pagos en estatus CAP (no aplicados aún)

    static cancelarPago = async (req: Request, res: Response) => {
        try {
            const { id_pago_cxc } = req.params;
            const pago = await CxCService.cancelarPago(id_pago_cxc);
            res.status(200).json({ message: 'Pago cancelado correctamente.', pago });
        } catch (error: any) {
            console.error(error);
            const status = /no encontrado|ya aplicado|ya cancelado/.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error?.message ?? 'Error al cancelar el pago.' });
        }
    };
}
