import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { DevolucionClienteService } from '../services/Devolucion_Cliente.service';

export const DevolucionClienteController = {

    // POST /devolucion_cliente
    crear: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado = req.user!.id_referencia_persona;
            const result = await DevolucionClienteService.crear(id_empleado, req.body);
            res.status(201).json({ message: 'Solicitud de devolución registrada.', ...result });
        } catch (error: any) {
            console.error('Error al crear devolución:', error);
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/mis-devoluciones
    misDevoluciones: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado = req.user!.id_referencia_persona;
            const data = await DevolucionClienteService.misDevoluciones(id_empleado);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/:id
    getById: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await DevolucionClienteService.getById(req.params.id);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/factura/:id_factura  — productos de la factura para llenar el form
    getFacturaParaDevolucion: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await DevolucionClienteService.getFacturaParaDevolucion(req.params.id_factura);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/buscar-facturas?q=A-1001
    buscarFacturas: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado = req.user!.id_referencia_persona;
            const busqueda = String(req.query.q ?? '');
            const data = await DevolucionClienteService.buscarFacturas(id_empleado, busqueda);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente  — todas (admin)
    getAll: async (req: AuthedRequest, res: Response) => {
        try {
            const { estatus, id_agente, fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            const data = await DevolucionClienteService.getAll({
                estatus:      estatus      || undefined,
                id_agente:    id_agente    || undefined,
                fecha_inicio: fecha_inicio || undefined,
                fecha_fin:    fecha_fin    || undefined,
            });
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // POST /devolucion_cliente/:id/aprobar  — aprobar con efectos financieros + CFDI-E
    // Body: { recibio_mercancia: boolean }
    aprobar: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado_aprueba = req.user!.id_referencia_persona;
            const recibio_mercancia   = req.body?.recibio_mercancia === true;

            const resultado = await DevolucionClienteService.aprobar(
                req.params.id,
                id_empleado_aprueba,
                recibio_mercancia,
            );

            const fmt = (n: number) => `$${n.toFixed(2)}`;
            const stockMsg = recibio_mercancia
                ? ' Mercancía recibida — entrada registrada en inventario (pendiente de ubicar).'
                : '';
            const msg =
                resultado.resultado_aprobacion === 'DESCUENTO_CXC'
                    ? `Devolución aprobada. CFDI-E: ${resultado.egreso.uuid_cfdi_egreso}. Se descontaron ${fmt(resultado.monto_devolucion)} de la CxC.${stockMsg}`
                    : `Devolución aprobada. CFDI-E: ${resultado.egreso.uuid_cfdi_egreso}. Nota de Crédito de ${fmt(resultado.monto_devolucion)} generada.${stockMsg}`;

            res.status(200).json({
                message:              msg,
                resultado_aprobacion: resultado.resultado_aprobacion,
                monto:                resultado.monto_devolucion,
                uuid_cfdi_egreso:     resultado.egreso.uuid_cfdi_egreso,
                folio_egreso:         resultado.egreso.folio,
                recibio_mercancia,
            });
        } catch (error: any) {
            console.error('Error al aprobar devolución:', error);
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // POST /devolucion_cliente/:id/rechazar  — rechazar sin efectos financieros
    rechazar: async (req: AuthedRequest, res: Response) => {
        try {
            await DevolucionClienteService.rechazar(req.params.id);
            res.status(200).json({ message: 'Devolución rechazada.' });
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },
};
