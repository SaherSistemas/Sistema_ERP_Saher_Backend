import { DevolucionClienteRepository, IEntradaManualDevolucion } from '../repositories/Devolucion_Cliente.repository';
import { AgenteRepository } from '../../Agente_Venta/repositories/Agente.repository';
import { IDevolucionClienteCreate, IDevolucionDetalleCreate } from '../interface/Devolucion_Cliente.interface';
import { Detalle_Factura } from '../../../Facturas/model/Detalle_Factura.model';
import Devolucion_Cliente_Lote_Manual from '../model/Devolucion_Cliente_Lote_Manual.model';

const MOTIVOS = ['error_pedido', 'error_surtido', 'error_precio', 'mal_estado', 'otros'] as const;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface IFacturaAdmin {
    id_factura: string;
    folio_factura: string;
    fecha_emision: string;
    total_factura: number;
    estatus_factura: string;
    id_pedido_alm: string | null;
    cliente: string | null;
    id_agente: string | null;
    agente: string | null;
    modo: 'ARTICULOS' | 'TOTAL';
    lineas: ILineaDevolvible[];
    monto_ya_devuelto: number;
    total_disponible: number;
    /** Saldo pendiente de la factura si sigue viva (con CxC sin pagar); null si no tiene o ya está pagada */
    cxc_saldo_pendiente: number | null;
}

export interface ILineaDevolvible {
    clave: string;                 // id_articulo (o id del renglón si no tiene artículo)
    id_articulo: string | null;
    descripcion_articulo: string;
    cantidad_facturada: number;
    cantidad_ya_devuelta: number;
    cantidad_disponible: number;
    precio_unitario: number;
    tasa_iva: number;
}

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

    // ── ADMIN: buscar facturas por folio o cliente ──────────────────────
    buscarFacturasAdmin: async (busqueda: string) => {
        const q = (busqueda ?? '').trim();
        if (q.length < 2) return [];
        const filas = await DevolucionClienteRepository.buscarFacturasAdmin(q);
        return filas.map((f: any) => ({
            ...f,
            // Sin detalle de artículos = factura vieja (migrada): solo nota de crédito por el total
            modo: Number(f.n_detalles) > 0 ? 'ARTICULOS' : 'TOTAL',
        }));
    },

    // ── ADMIN: factura con lo que todavía se puede devolver ─────────────
    //    modo ARTICULOS → líneas con cantidad disponible (facturado − ya devuelto)
    //    modo TOTAL     → factura vieja: solo total_disponible (total − ya devuelto)
    getFacturaAdmin: async (id_factura: string): Promise<IFacturaAdmin> => {
        const cab = await DevolucionClienteRepository.getCabeceraFacturaAdmin(id_factura);
        if (!cab) throw { status: 404, message: 'Factura no encontrada (o no es una factura de ingreso).' };
        if (cab.estatus_factura === 'CAN') throw { status: 400, message: 'La factura está cancelada.' };

        const detalles = await Detalle_Factura.findAll({ where: { id_factura }, raw: true }) as any[];
        const yaDevuelto = await DevolucionClienteRepository.getCantidadesYaDevueltas(id_factura);
        const cxc_saldo_pendiente = await DevolucionClienteRepository.getSaldoCxcFactura(id_factura);

        if (detalles.length === 0) {
            const montoYaDevuelto = await DevolucionClienteRepository.getMontoYaDevuelto(id_factura);
            return {
                ...cab,
                modo: 'TOTAL',
                lineas: [] as ILineaDevolvible[],
                monto_ya_devuelto: r2(montoYaDevuelto),
                total_disponible: r2(Math.max(0, Number(cab.total_factura) - montoYaDevuelto)),
                cxc_saldo_pendiente,
            };
        }

        // Si un artículo aparece en varios renglones se junta en uno solo
        const porClave = new Map<string, ILineaDevolvible>();
        for (const d of detalles) {
            const clave = String(d.id_articulo ?? d.id_detalle_fact);
            const previo = porClave.get(clave);
            if (previo) {
                previo.cantidad_facturada += Number(d.cantidad_facturada);
                continue;
            }
            porClave.set(clave, {
                clave,
                id_articulo: d.id_articulo ?? null,
                descripcion_articulo: d.descripcion_articulo,
                cantidad_facturada: Number(d.cantidad_facturada),
                cantidad_ya_devuelta: 0,
                cantidad_disponible: 0,
                precio_unitario: Number(d.precio_artic),
                tasa_iva: Number(d.tasa_iva ?? 0),
            });
        }
        const lineas = Array.from(porClave.values()).map(l => {
            const devuelto = l.id_articulo ? (yaDevuelto[l.id_articulo] ?? 0) : 0;
            return { ...l, cantidad_ya_devuelta: devuelto, cantidad_disponible: Math.max(0, l.cantidad_facturada - devuelto) };
        });

        return {
            ...cab,
            modo: 'ARTICULOS',
            lineas,
            monto_ya_devuelto: 0,
            total_disponible: r2(lineas.reduce((s, l) => s + l.cantidad_disponible * l.precio_unitario, 0)),
            cxc_saldo_pendiente,
        };
    },

    // ── ADMIN: crear devolución desde el ERP (opcionalmente aprobarla en el acto) ──
    crearAdmin: async (
        id_empleado: string,
        id_empresa: string | undefined,
        body: {
            id_factura: string;
            motivo: string;
            motivo_otros?: string | null;
            observaciones?: string | null;
            detalles?: { clave: string; cantidad: number }[];
            monto_total?: number;
            /** Factura vieja: artículos capturados a mano (precio con IVA); el monto sale de su suma */
            lineas_manual?: { id_articulo?: string | null; descripcion: string; cantidad: number; precio_unitario: number; numero_lote?: string; fecha_caducidad?: string }[];
            aprobar?: boolean;
            recibio_mercancia?: boolean;
            descontar_cxc?: boolean;
        },
    ) => {
        if (!body.id_factura) throw { status: 400, message: 'Falta la factura.' };
        if (!(MOTIVOS as readonly string[]).includes(body.motivo)) {
            throw { status: 400, message: 'Motivo de devolución no válido.' };
        }
        if (body.motivo === 'otros' && !body.motivo_otros?.trim()) {
            throw { status: 400, message: 'Debes especificar el motivo en el campo "Otros".' };
        }

        const info = await DevolucionClienteService.getFacturaAdmin(body.id_factura);
        if (!info.id_agente) {
            throw { status: 400, message: 'No se pudo determinar el agente de esta factura (ni por el pedido ni por el cliente).' };
        }

        let detalles: IDevolucionDetalleCreate[];
        // Factura anterior con la mercancía recibida: lote y caducidad capturados a mano (entra sin ubicación)
        let entradasManual: IEntradaManualDevolucion[] = [];

        if (info.modo === 'TOTAL' && Array.isArray(body.lineas_manual) && body.lineas_manual.length > 0) {
            // Factura vieja con artículos capturados a mano: el monto es la suma de los renglones
            detalles = body.lineas_manual.map(l => {
                const cantidad = Number(l.cantidad);
                const precio = Number(l.precio_unitario);
                const descripcion = String(l.descripcion ?? '').trim();
                if (!descripcion) throw { status: 400, message: 'Cada renglón debe tener un artículo o descripción.' };
                if (!Number.isInteger(cantidad) || cantidad <= 0) {
                    throw { status: 400, message: `La cantidad de "${descripcion}" debe ser un entero mayor a 0.` };
                }
                if (!Number.isFinite(precio) || precio <= 0) {
                    throw { status: 400, message: `El precio de "${descripcion}" debe ser mayor a 0.` };
                }
                return {
                    id_articulo: l.id_articulo || null,
                    descripcion_articulo: descripcion,
                    cantidad_facturada: cantidad,
                    cantidad_devolucion: cantidad,
                    precio_unitario: precio,
                    subtotal_devolucion: r2(precio * cantidad),
                };
            });
            if (body.recibio_mercancia === true) {
                entradasManual = body.lineas_manual.map(l => {
                    const lote = String(l.numero_lote ?? '').trim();
                    const cad = String(l.fecha_caducidad ?? '').slice(0, 10);
                    if (!l.id_articulo) {
                        throw { status: 400, message: `"${l.descripcion}": para dar entrada al almacén elige el artículo del catálogo (no renglón libre).` };
                    }
                    if (!lote) throw { status: 400, message: `"${l.descripcion}": falta el número de lote.` };
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(cad)) throw { status: 400, message: `"${l.descripcion}": falta la fecha de caducidad.` };
                    return {
                        id_articulo: l.id_articulo,
                        descripcion: String(l.descripcion).trim(),
                        cantidad: Number(l.cantidad),
                        numero_lote: lote,
                        fecha_caducidad: cad,
                    };
                });
            }
            if (body.recibio_mercancia !== true) {
                // No llegó al almacén: va al inventario virtual del agente; el lote y la caducidad son opcionales
                // (sirven para poder recibirlo después), pero si se captura uno debe venir el otro.
                entradasManual = body.lineas_manual
                    .filter(l => l.id_articulo)
                    .map(l => {
                        const lote = String(l.numero_lote ?? '').trim();
                        const cad = String(l.fecha_caducidad ?? '').slice(0, 10);
                        if ((lote && !cad) || (!lote && cad)) {
                            throw { status: 400, message: `"${l.descripcion}": captura lote y caducidad juntos (o ninguno).` };
                        }
                        return {
                            id_articulo: l.id_articulo as string,
                            descripcion: String(l.descripcion).trim(),
                            cantidad: Number(l.cantidad),
                            numero_lote: lote || undefined,
                            fecha_caducidad: cad || undefined,
                        };
                    });
            }
            const montoLineas = r2(detalles.reduce((s, d) => s + Number(d.subtotal_devolucion), 0));
            if (montoLineas > info.total_disponible + 0.009) {
                throw { status: 400, message: `Los artículos suman ${montoLineas.toFixed(2)} y lo disponible de la factura es ${info.total_disponible.toFixed(2)}.` };
            }
        } else if (info.modo === 'TOTAL') {
            const monto = r2(Number(body.monto_total));
            if (!Number.isFinite(monto) || monto <= 0) {
                throw { status: 400, message: 'Captura el monto a devolver (mayor a 0).' };
            }
            if (monto > info.total_disponible + 0.009) {
                throw { status: 400, message: `El monto no puede ser mayor a lo disponible de la factura (${info.total_disponible.toFixed(2)}).` };
            }
            detalles = [{
                id_articulo: null,
                descripcion_articulo: `Devolución de factura anterior ${info.folio_factura} (solo total)`,
                cantidad_facturada: 1,
                cantidad_devolucion: 1,
                precio_unitario: monto,
                subtotal_devolucion: monto,
            }];
        } else {
            const pedidas = (body.detalles ?? []).filter(d => Number(d.cantidad) > 0);
            if (!pedidas.length) throw { status: 400, message: 'Selecciona al menos un producto con cantidad a devolver.' };
            const porClave = new Map(info.lineas.map(l => [l.clave, l]));
            detalles = pedidas.map(p => {
                const l = porClave.get(String(p.clave));
                if (!l) throw { status: 400, message: 'Uno de los productos no pertenece a la factura.' };
                const cant = Number(p.cantidad);
                if (!Number.isInteger(cant) || cant <= 0) {
                    throw { status: 400, message: `La cantidad de "${l.descripcion_articulo}" debe ser un entero mayor a 0.` };
                }
                if (cant > l.cantidad_disponible) {
                    throw { status: 400, message: `"${l.descripcion_articulo}": solo hay ${l.cantidad_disponible} disponibles para devolver.` };
                }
                return {
                    id_articulo: l.id_articulo,
                    descripcion_articulo: l.descripcion_articulo,
                    cantidad_facturada: l.cantidad_facturada,
                    cantidad_devolucion: cant,
                    precio_unitario: l.precio_unitario,
                    subtotal_devolucion: r2(l.precio_unitario * cant),
                };
            });
        }

        const { id_devolucion_cliente } = await DevolucionClienteRepository.create({
            id_factura: body.id_factura,
            id_agente: info.id_agente,
            motivo: body.motivo as IDevolucionClienteCreate['motivo'],
            motivo_otros: body.motivo_otros ?? null,
            observaciones: body.observaciones ?? null,
            detalles,
        });

        // Lote y caducidad capturados: se guardan con la solicitud para que al aprobarla después no se pierdan
        const conLote = entradasManual.filter(e => e.id_articulo && e.numero_lote && e.fecha_caducidad);
        if (conLote.length) {
            await Devolucion_Cliente_Lote_Manual.bulkCreate(conLote.map(e => ({
                id_devolucion_cliente,
                id_articulo: e.id_articulo,
                numero_lote: e.numero_lote as string,
                fecha_caducidad: e.fecha_caducidad as string,
            })) as any);
        }

        if (!body.aprobar) {
            return { id_devolucion_cliente, aprobada: false as const, modo: info.modo };
        }
        if (info.modo === 'ARTICULOS' && typeof body.recibio_mercancia !== 'boolean') {
            throw {
                status: 400,
                message: 'La devolución quedó PENDIENTE; indica si se recibió la mercancía para aprobarla.',
            };
        }

        try {
            const resultado = await DevolucionClienteService.aprobar(
                id_devolucion_cliente,
                id_empleado,
                body.recibio_mercancia === true,
                id_empresa,
                { descontar_cxc: body.descontar_cxc === true, entradas_manual: entradasManual },
            );
            return { id_devolucion_cliente, aprobada: true as const, modo: info.modo, resultado };
        } catch (err: any) {
            throw {
                status: err?.status ?? 500,
                message: `La devolución se registró como PENDIENTE pero no pudo aprobarse: ${err?.message ?? 'error desconocido'}`,
            };
        }
    },

    // ── ADMIN: asignar lote y caducidad a un renglón del inventario virtual ──
    asignarLoteInventarioVirtual: async (id_inventario_virtual: string, id_empresa: string, numero_lote: string, fecha_caducidad: string) => {
        const lote = String(numero_lote ?? '').trim();
        const cad = String(fecha_caducidad ?? '').slice(0, 10);
        if (!lote) throw { status: 400, message: 'Captura el número de lote.' };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cad)) throw { status: 400, message: 'Captura la fecha de caducidad.' };
        return await DevolucionClienteRepository.asignarLoteInventarioVirtual(id_inventario_virtual, id_empresa, lote, cad);
    },

    // ── Inventario virtual del agente logueado (por artículo) ───────────
    miInventarioVirtual: async (id_empleado: string) => {
        const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
        if (!agente) return {};
        return await DevolucionClienteRepository.getInventarioVirtualDeAgente(agente.id_agente);
    },

    // ── Inventario virtual de agentes ───────────────────────────────────
    inventarioVirtual: async (id_empresa: string, filtros: { id_agente?: string; estatus?: string }) => {
        return await DevolucionClienteRepository.getInventarioVirtual(id_empresa, filtros);
    },

    recibirInventarioVirtual: async (ids: string[], id_empresa: string, id_empleado: string) => {
        const limpios = Array.from(new Set((ids ?? []).map(String).filter(Boolean)));
        if (!limpios.length) throw { status: 400, message: 'Selecciona al menos un renglón.' };
        return await DevolucionClienteRepository.recibirInventarioVirtual(limpios, id_empresa, id_empleado);
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
    aprobar: async (id: string, id_empleado_aprueba: string, recibio_mercancia: boolean, id_empresa?: string, opciones?: { descontar_cxc?: boolean; entradas_manual?: IEntradaManualDevolucion[] }) => {
        const dev = await DevolucionClienteRepository.getById(id);
        if (!dev) throw { status: 404, message: 'Devolución no encontrada.' };
        if (dev.estatus !== 'PENDIENTE') {
            throw { status: 400, message: `Solo se pueden aprobar devoluciones en estatus PENDIENTE. Estatus actual: ${dev.estatus}` };
        }
        const resultado = await DevolucionClienteRepository.aprobar(id, id_empleado_aprueba, recibio_mercancia, id_empresa, opciones);
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
