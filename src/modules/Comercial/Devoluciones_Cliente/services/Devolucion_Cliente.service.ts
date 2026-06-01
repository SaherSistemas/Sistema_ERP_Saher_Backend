import { DevolucionClienteRepository } from '../repositories/Devolucion_Cliente.repository';
import { AgenteRepository } from '../../Agente_Venta/repositories/Agente.repository';
import { IDevolucionClienteCreate } from '../interface/Devolucion_Cliente.interface';

export const DevolucionClienteService = {

    // ── Crear solicitud (desde JWT del agente) ──────────────────────────
    crear: async (id_empleado: string, body: Omit<IDevolucionClienteCreate, 'id_agente'>) => {
        const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
        if (!agente) throw { status: 404, message: 'No se encontró un agente asociado a este usuario.' };

        if (!body.detalles || body.detalles.length === 0) {
            throw { status: 400, message: 'Debes seleccionar al menos un producto para devolver.' };
        }

        for (const d of body.detalles) {
            if (d.cantidad_devolucion <= 0) {
                throw { status: 400, message: `La cantidad a devolver de "${d.descripcion_articulo}" debe ser mayor a 0.` };
            }
            if (d.cantidad_devolucion > d.cantidad_facturada) {
                throw { status: 400, message: `No puedes devolver más unidades de las facturadas en "${d.descripcion_articulo}".` };
            }
        }

        if (body.motivo === 'otros' && !body.motivo_otros?.trim()) {
            throw { status: 400, message: 'Debes especificar el motivo en el campo "Otros".' };
        }

        const result = await DevolucionClienteRepository.create({
            ...body,
            id_agente: agente.id_agente,
        });

        return result;
    },

    // ── Mis devoluciones (agente logueado) ─────────────────────────────
    misDevoluciones: async (id_empleado: string) => {
        const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
        if (!agente) throw { status: 404, message: 'No se encontró un agente asociado a este usuario.' };
        return await DevolucionClienteRepository.getByAgente(agente.id_agente);
    },

    // ── Detalle de una devolución ───────────────────────────────────────
    getById: async (id: string) => {
        const dev = await DevolucionClienteRepository.getById(id);
        if (!dev) throw { status: 404, message: 'Devolución no encontrada.' };
        return dev;
    },

    // ── Factura con sus productos (para el formulario de devolución) ────
    //    Devuelve las cantidades DISPONIBLES para devolver:
    //      cantidad_facturada original − lo ya devuelto (PENDIENTE o APROBADA)
    //    Los artículos con disponible = 0 se omiten del resultado.
    getFacturaParaDevolucion: async (id_factura: string) => {
        const factura = await DevolucionClienteRepository.getFacturaConDetalles(id_factura);
        if (!factura) throw { status: 404, message: 'Factura no encontrada.' };

        // Cantidades ya comprometidas en otras devoluciones
        const yaDevuelto = await DevolucionClienteRepository.getCantidadesYaDevueltas(id_factura);

        // Si no hay devoluciones previas, devolvemos la factura tal cual
        if (Object.keys(yaDevuelto).length === 0) return factura;

        // Ajustar detalles restando cantidades ya devueltas
        const facturaJson = factura.toJSON() as any;
        const detallesOriginales: any[] = facturaJson.detalles ?? [];

        facturaJson.detalles = detallesOriginales
            .map((d: any) => {
                const devuelto   = d.id_articulo ? (yaDevuelto[d.id_articulo] ?? 0) : 0;
                const disponible = Math.max(0, Number(d.cantidad_facturada) - devuelto);
                return {
                    ...d,
                    cantidad_facturada:    disponible,   // el form usa este campo como máximo
                    cantidad_ya_devuelta:  devuelto,     // info extra para el frontend si quiere mostrarlo
                };
            })
            .filter((d: any) => d.cantidad_facturada > 0);  // ocultar artículos totalmente devueltos

        // Recalcular total disponible (informativo)
        facturaJson.total_disponible_devolucion = facturaJson.detalles.reduce(
            (s: number, d: any) => s + Number(d.cantidad_facturada) * Number(d.precio_artic ?? d.precio_unitario ?? 0),
            0
        );

        return facturaJson;
    },

    // ── Buscar facturas del agente ──────────────────────────────────────
    buscarFacturas: async (id_empleado: string, busqueda: string) => {
        const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
        if (!agente) throw { status: 404, message: 'No se encontró un agente asociado a este usuario.' };
        if (!busqueda || busqueda.trim().length < 1) return [];
        return await DevolucionClienteRepository.buscarFacturasAgente(agente.id_agente, busqueda.trim());
    },

    // ── Todas las devoluciones (admin) ──────────────────────────────────
    getAll: async (filtros?: {
        estatus?: string;
        id_agente?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
    }) => {
        return await DevolucionClienteRepository.getAll(filtros);
    },

    // ── Aprobar devolución con efectos financieros ──────────────────────
    aprobar: async (id: string, id_empleado_aprueba: string, recibio_mercancia: boolean) => {
        const dev = await DevolucionClienteRepository.getById(id);
        if (!dev) throw { status: 404, message: 'Devolución no encontrada.' };
        if (dev.estatus !== 'PENDIENTE') {
            throw { status: 400, message: `Solo se pueden aprobar devoluciones en estatus PENDIENTE. Estatus actual: ${dev.estatus}` };
        }
        const resultado = await DevolucionClienteRepository.aprobar(id, id_empleado_aprueba, recibio_mercancia);
        if (!resultado) throw { status: 404, message: 'Devolución no encontrada.' };
        return resultado;
    },

    // ── Rechazar devolución ─────────────────────────────────────────────
    rechazar: async (id: string) => {
        const dev = await DevolucionClienteRepository.getById(id);
        if (!dev) throw { status: 404, message: 'Devolución no encontrada.' };
        if (dev.estatus !== 'PENDIENTE') {
            throw { status: 400, message: `Solo se pueden rechazar devoluciones en estatus PENDIENTE. Estatus actual: ${dev.estatus}` };
        }
        const resultado = await DevolucionClienteRepository.rechazar(id);
        if (!resultado) throw { status: 404, message: 'Devolución no encontrada.' };
        return resultado;
    },
};
