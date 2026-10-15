import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { DevolucionClienteService } from '../services/Devolucion_Cliente.service';

// Las rutas "admin" de devoluciones (crear desde ERP, inventario virtual) solo para prioridad <= 2
const soloAdmin = (req: AuthedRequest, res: Response): boolean => {
    const prioridad = (req.user as any)?.prioridad;
    if (prioridad == null || Number(prioridad) > 2) {
        res.status(403).json({ message: 'Solo un administrador puede realizar esta acción.' });
        return false;
    }
    return true;
};

const fmtMoney = (n: number) => `$${Number(n).toFixed(2)}`;

export const DevolucionClienteController = {

    // GET /devolucion_cliente/admin/buscar-facturas?q=
    buscarFacturasAdmin: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            res.status(200).json(await DevolucionClienteService.buscarFacturasAdmin(String(req.query.q ?? '')));
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/admin/factura/:id_factura
    getFacturaAdmin: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            res.status(200).json(await DevolucionClienteService.getFacturaAdmin(req.params.id_factura));
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/mi-inventario-virtual → lo que el agente logueado tiene en su inventario virtual, por artículo
    miInventarioVirtual: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await DevolucionClienteService.miInventarioVirtual(req.user!.id_referencia_persona);
            res.status(200).json(data);
        } catch (err: any) {
            res.status(err?.status ?? 500).json({ message: err?.message ?? 'No se pudo consultar el inventario virtual.' });
        }
    },

    // POST /devolucion_cliente/admin
    crearAdmin: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            const r = await DevolucionClienteService.crearAdmin(
                req.user!.id_referencia_persona,
                req.user?.id_empresa,
                req.body ?? {},
            );
            if (!r.aprobada) {
                res.status(201).json({
                    message: 'Devolución registrada como PENDIENTE.',
                    id_devolucion_cliente: r.id_devolucion_cliente,
                    aprobada: false,
                });
                return;
            }
            const a = r.resultado;
            const partes: string[] = [];
            partes.push(a.resultado_aprobacion === 'DESCUENTO_CXC'
                ? `Se descontaron ${fmtMoney(a.monto_devolucion)} de la CxC. CFDI-E folio ${a.egreso?.folio}.`
                : `Nota de crédito de ${fmtMoney(a.monto_devolucion)} generada. CFDI-E folio ${a.egreso?.folio}.`);
            if (!a.es_factura_vieja) {
                partes.push(a.recibio_mercancia
                    ? 'Mercancía recibida: quedó SIN UBICACIÓN en el almacén.'
                    : a.inventario_virtual
                        ? 'Mercancía NO recibida: quedó en el inventario virtual del agente.'
                        : 'Mercancía NO recibida.');
            }
            res.status(201).json({
                message: partes.join(' '),
                id_devolucion_cliente: r.id_devolucion_cliente,
                aprobada: true,
                resultado_aprobacion: a.resultado_aprobacion,
                monto: a.monto_devolucion,
                folio_egreso: a.egreso?.folio ?? null,
                es_factura_vieja: a.es_factura_vieja,
                inventario_virtual: a.inventario_virtual,
                recibio_mercancia: a.recibio_mercancia,
            });
        } catch (error: any) {
            console.error('Error al crear devolución (admin):', error);
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /devolucion_cliente/inventario-virtual?id_agente=&estatus=EN_AGENTE|RECIBIDO
    inventarioVirtual: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            const { id_agente, estatus } = req.query as Record<string, string>;
            const data = await DevolucionClienteService.inventarioVirtual(req.user!.id_empresa, {
                id_agente: id_agente || undefined,
                estatus: estatus === 'RECIBIDO' ? 'RECIBIDO' : 'EN_AGENTE',
            });
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // PATCH /devolucion_cliente/inventario-virtual/lote  { id_inventario_virtual, numero_lote, fecha_caducidad }
    asignarLoteInventarioVirtual: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            const b = req.body ?? {};
            const data = await DevolucionClienteService.asignarLoteInventarioVirtual(
                String(b.id_inventario_virtual ?? ''), req.user!.id_empresa, b.numero_lote, b.fecha_caducidad,
            );
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // POST /devolucion_cliente/inventario-virtual/recibir  { ids: string[] }
    recibirInventarioVirtual: async (req: AuthedRequest, res: Response) => {
        try {
            if (!soloAdmin(req, res)) return;
            const data = await DevolucionClienteService.recibirInventarioVirtual(
                Array.isArray(req.body?.ids) ? req.body.ids : [],
                req.user!.id_empresa,
                req.user!.id_referencia_persona,
            );
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

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
                req.user?.id_empresa,
            );

            const fmt = (n: number) => `$${n.toFixed(2)}`;
            const stockMsg = recibio_mercancia
                ? ' Mercancía recibida — entrada registrada en inventario (pendiente de ubicar).'
                : resultado.inventario_virtual
                    ? ' Mercancía NO recibida — quedó en el inventario virtual del agente.'
                    : '';
            const cfdi = resultado.egreso ? ` Folio CFDI-E: ${resultado.egreso.folio}.` : '';
            const msg =
                resultado.resultado_aprobacion === 'DESCUENTO_CXC'
                    ? `Devolución aprobada.${cfdi} Se descontaron ${fmt(resultado.monto_devolucion)} de la CxC.${stockMsg}`
                    : `Devolución aprobada.${cfdi} Nota de Crédito de ${fmt(resultado.monto_devolucion)} generada.${stockMsg}`;

            res.status(200).json({
                message:              msg,
                resultado_aprobacion: resultado.resultado_aprobacion,
                monto:                resultado.monto_devolucion,
                folio_egreso:         resultado.egreso?.folio ?? null,
                ruta_txt:             resultado.egreso?.ruta_txt,
                recibio_mercancia,
                inventario_virtual:   resultado.inventario_virtual,
                es_factura_vieja:     resultado.es_factura_vieja,
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
