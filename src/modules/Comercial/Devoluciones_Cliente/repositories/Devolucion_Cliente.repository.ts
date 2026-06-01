import { v4 as uuidv4 } from 'uuid';
import { QueryTypes, Transaction } from 'sequelize';
import Devolucion_Cliente from '../model/Devolucion_Cliente.model';
import Devolucion_Cliente_Detalle from '../model/Devolucion_Cliente_Detalle.model';
import Facturas from '../../../Facturas/model/Facturas.model';
import { Detalle_Factura } from '../../../Facturas/model/Detalle_Factura.model';
import Agente_De_Venta from '../../Agente_Venta/model/Agente_De_Venta';
import Empleado from '../../../RRHH/model/Empleado';
import { IDevolucionClienteCreate } from '../interface/Devolucion_Cliente.interface';
import { dbLocal } from '../../../../config/db';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';
import Cuenta_Por_Cobrar from '../../../Finanzas/Cuentas_Por_Cobrar/model/Cuenta_Por_Cobrar.model';
import Nota_Credito_Cliente from '../../Notas_Credito_Cliente/model/Nota_Credito_Cliente.model';
import Remision from '../../../Finanzas/Remisiones/model/Remision.model';
import Pago_CxC from '../../../Finanzas/Cuentas_Por_Cobrar/model/Pago_CxC.model';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Kardex_Movimientos_Articulos from '../../../Almacen/Kardex/model/Kardex_Movimientos_Articulos';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { timbraDevolucionEgreso } from '../helpers/Devolucion_Egreso.helper';

export const DevolucionClienteRepository = {

    // ── Crear solicitud de devolución completa (cabecera + detalles) ──
    create: async (data: IDevolucionClienteCreate) => {
        const t = await dbLocal.transaction();
        try {
            const id_devolucion_cliente = uuidv4();

            await Devolucion_Cliente.create({
                id_devolucion_cliente,
                id_factura: data.id_factura,
                id_agente: data.id_agente,
                motivo: data.motivo,
                motivo_otros: data.motivo_otros ?? null,
                observaciones: data.observaciones ?? null,
                estatus: 'PENDIENTE',
                fecha_solicitud: new Date(),
            }, { transaction: t });

            const detalles = data.detalles.map(d => ({
                id_devolucion_detalle: uuidv4(),
                id_devolucion_cliente,
                id_articulo: d.id_articulo ?? null,
                descripcion_articulo: d.descripcion_articulo,
                cantidad_facturada: d.cantidad_facturada,
                cantidad_devolucion: d.cantidad_devolucion,
                precio_unitario: d.precio_unitario,
                subtotal_devolucion: d.subtotal_devolucion,
            }));

            await Devolucion_Cliente_Detalle.bulkCreate(detalles, { transaction: t });

            await t.commit();
            return { id_devolucion_cliente };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // ── Todas las devoluciones de un agente ──
    getByAgente: async (id_agente: string) => {
        return await Devolucion_Cliente.findAll({
            where: { id_agente },
            include: [
                { model: Facturas, attributes: ['folio_factura', 'fecha_emision', 'total_factura'] },
                { model: Devolucion_Cliente_Detalle },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Una devolución específica con todos sus detalles ──
    getById: async (id_devolucion_cliente: string) => {
        return await Devolucion_Cliente.findByPk(id_devolucion_cliente, {
            include: [
                { model: Facturas, attributes: ['folio_factura', 'fecha_emision', 'total_factura'] },
                {
                    model: Agente_De_Venta,
                    include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }],
                },
                { model: Devolucion_Cliente_Detalle },
            ],
        });
    },

    // ── Devoluciones relacionadas a una factura ──
    getByFactura: async (id_factura: string) => {
        return await Devolucion_Cliente.findAll({
            where: { id_factura },
            include: [{ model: Devolucion_Cliente_Detalle }],
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Detalle de factura (para mostrar productos al crear devolución) ──
    getFacturaConDetalles: async (id_factura: string) => {
        return await Facturas.findByPk(id_factura, {
            attributes: ['id_factura', 'folio_factura', 'fecha_emision', 'total_factura', 'estatus_factura', 'id_cliente_alm'],
            include: [{ model: Detalle_Factura }],
        });
    },

    // ── Todas las devoluciones (vista admin) con filtros opcionales ──
    getAll: async (filtros?: {
        estatus?: string;
        id_agente?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
    }) => {
        const { Op } = await import('sequelize');
        const where: Record<string, any> = {};
        if (filtros?.estatus) where['estatus'] = filtros.estatus;
        if (filtros?.id_agente) where['id_agente'] = filtros.id_agente;
        if (filtros?.fecha_inicio || filtros?.fecha_fin) {
            where['fecha_solicitud'] = {};
            if (filtros.fecha_inicio) where['fecha_solicitud'][Op.gte] = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin) where['fecha_solicitud'][Op.lte] = new Date(filtros.fecha_fin + 'T23:59:59');
        }
        return await Devolucion_Cliente.findAll({
            where,
            include: [
                { model: Facturas, attributes: ['folio_factura', 'fecha_emision', 'total_factura'] },
                {
                    model: Agente_De_Venta,
                    include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }],
                },
                { model: Devolucion_Cliente_Detalle },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Aprobar devolución con efectos financieros ─────────────────────
    //
    //  Flujo:
    //   A) Timbra CFDI-E en FacturAPI (siempre)
    //   B) Escenario 1 — CxC pendiente: descuenta + pago_cxc DEV
    //   C) Escenario 2 — CxC pagada: nota_credito_cliente
    //   D) Si recibio_mercancia = true: restaura stock con el lote original
    //      (factura → pedido → detalle_pedido_almacen_lote → id_lote_sucursal)
    //
    aprobar: async (
        id_devolucion_cliente: string,
        id_empleado_aprueba: string,
        recibio_mercancia: boolean,
    ) => {

        // ── 1. Cargar devolución ──────────────────────────────────────────
        const dev = await Devolucion_Cliente.findByPk(id_devolucion_cliente, {
            include: [
                { model: Devolucion_Cliente_Detalle },
                {
                    model: Facturas,
                    attributes: ['id_factura', 'folio_factura', 'id_cliente_alm',
                        'id_metodo_pago', 'id_forma_pago', 'id_pedido_alm'],
                },
            ],
        });
        if (!dev) return null;

        if (dev.estatus !== 'PENDIENTE') {
            throw Object.assign(new Error('La devolución ya fue procesada.'), { status: 400 });
        }

        // ── 2. Calcular monto ─────────────────────────────────────────────
        const monto_devolucion = dev.detalles.reduce(
            (sum, d) => sum + Number(d.subtotal_devolucion), 0
        );
        if (monto_devolucion <= 0) {
            throw Object.assign(new Error('El monto de la devolución debe ser mayor a 0.'), { status: 400 });
        }

        // ── 3. Buscar CxC ─────────────────────────────────────────────────
        let cxc = await Cuenta_Por_Cobrar.findOne({
            where: { id_factura: dev.id_factura },
            order: [['createdAt', 'DESC']],
        });
        if (!cxc) {
            const remision = await Remision.findOne({
                where: { id_factura: dev.id_factura }, attributes: ['id_remision'],
            });
            if (remision) {
                cxc = await Cuenta_Por_Cobrar.findOne({
                    where: { id_remision: remision.id_remision },
                    order: [['createdAt', 'DESC']],
                });
            }
        }

        // ── 4. Timbrar CFDI-E ─────────────────────────────────────────────
        const egreso = await timbraDevolucionEgreso({
            id_factura: dev.id_factura,
            detalles: dev.detalles,
        });

        // ── 5. Efectos financieros + stock (dentro de 1 transacción) ─────
        const facturaIncludes = (dev as any).factura as (Facturas & { id_pedido_alm?: string }) | undefined;
        const id_forma_pago = facturaIncludes?.id_forma_pago ?? '17';
        const id_metodo_pago = facturaIncludes?.id_metodo_pago ?? 'PUE';
        const id_pedido_alm = facturaIncludes?.id_pedido_alm ?? null;
        const folio_factura = facturaIncludes?.folio_factura ?? dev.id_factura;

        const t = await dbLocal.transaction();
        try {
            let resultado_aprobacion: string;
            let id_cxc_afectada: string | null = null;

            // ── 5A. Efecto financiero ────────────────────────────────────
            if (cxc && cxc.estatus_cxc !== 'PAG') {
                const nuevo_saldo = Math.max(0, Number(cxc.saldo_pendiente) - monto_devolucion);
                const nuevo_total = Math.max(0, Number(cxc.monto_total) - monto_devolucion);
                const nuevo_pagado = Number(cxc.monto_pagado);
                const nuevo_estatus =
                    nuevo_saldo <= 0 ? 'PAG' :
                        nuevo_pagado > 0 ? 'PAR' : 'PEN';

                await cxc.update(
                    { monto_total: nuevo_total, saldo_pendiente: nuevo_saldo, estatus_cxc: nuevo_estatus },
                    { transaction: t }
                );

                await Pago_CxC.create({
                    id_pago_cxc: uuidv4(),
                    id_cxc: cxc.id_cxc,
                    id_metodo_pago,
                    id_forma_pago,
                    monto_pago: monto_devolucion,
                    fecha_pago: new Date(),
                    numero_recibo: `DEV-${id_devolucion_cliente.slice(0, 8)}`,
                    referencia_pago: egreso.uuid_cfdi_egreso,
                    id_empleado_captura: id_empleado_aprueba,
                    id_empleado_aplica: id_empleado_aprueba,
                    fecha_aplicado: new Date(),
                    notas: `Descuento automático — devolución aprobada. CFDI-E: ${egreso.uuid_cfdi_egreso}`,
                    estatus_pago: 'DEV',
                }, { transaction: t });

                resultado_aprobacion = 'DESCUENTO_CXC';
                id_cxc_afectada = cxc.id_cxc;
            } else {
                const concepto = `Devolución aprobada · Factura: ${folio_factura}`;
                const id_cliente_alm = facturaIncludes?.id_cliente_alm
                    ?? await getClienteFromFactura(dev.id_factura, t);

                await Nota_Credito_Cliente.create({
                    id_nota_credito: uuidv4(),
                    id_cliente_alm,
                    id_devolucion_cliente: dev.id_devolucion_cliente,
                    monto_original: monto_devolucion,
                    saldo_disponible: monto_devolucion,
                    estatus: 'DISPONIBLE',
                    concepto,
                    uuid_cfdi_egreso: egreso.uuid_cfdi_egreso,
                }, { transaction: t });

                resultado_aprobacion = 'NOTA_CREDITO';
            }

            // ── 5B. Entrada de mercancía (si se recibió físicamente) ─────
            if (recibio_mercancia && id_pedido_alm) {
                await registrarEntradaMercancia({
                    detalles: dev.detalles,
                    id_pedido_alm,
                    id_devolucion_cliente: dev.id_devolucion_cliente,
                    id_empleado_aprueba,
                    folio_factura,
                    t,
                });
            }

            // ── 5C. Actualizar devolución ────────────────────────────────
            await dev.update({
                estatus: 'APROBADA',
                resultado_aprobacion,
                id_cxc_afectada,
                uuid_cfdi_egreso: egreso.uuid_cfdi_egreso,
                id_factura_egreso: egreso.id_factura_egreso,
                recibio_mercancia,
                fecha_recepcion_mercancia: recibio_mercancia ? new Date() : null,
            }, { transaction: t });

            await t.commit();
            return { dev, resultado_aprobacion, monto_devolucion, egreso, recibio_mercancia };

        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // ── Rechazar devolución (sin efectos financieros) ──────────────────
    rechazar: async (id_devolucion_cliente: string) => {
        const dev = await Devolucion_Cliente.findByPk(id_devolucion_cliente);
        if (!dev) return null;
        await dev.update({ estatus: 'RECHAZADA' });
        return dev;
    },

    // ── Notas de crédito disponibles para un cliente ───────────────────
    getNotasCreditoCliente: async (id_cliente_alm: string) => {
        return await Nota_Credito_Cliente.findAll({
            where: { id_cliente_alm },
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Cantidades ya devueltas por artículo en una factura ────────────
    //    Suma las devoluciones en estatus PENDIENTE o APROBADA.
    //    Las RECHAZADAS no cuentan — esos artículos vuelven a estar disponibles.
    //    Devuelve: { [id_articulo]: cantidad_total_devuelta }
    getCantidadesYaDevueltas: async (id_factura: string): Promise<Record<string, number>> => {
        const { Op } = await import('sequelize');

        const devoluciones = await Devolucion_Cliente.findAll({
            where: {
                id_factura,
                estatus: { [Op.in]: ['PENDIENTE', 'APROBADA'] },
            },
            include: [{ model: Devolucion_Cliente_Detalle }],
        });

        const mapa: Record<string, number> = {};
        for (const dev of devoluciones) {
            for (const det of dev.detalles) {
                if (det.id_articulo) {
                    mapa[det.id_articulo] = (mapa[det.id_articulo] ?? 0) + Number(det.cantidad_devolucion);
                }
            }
        }
        return mapa;
    },

    // ── Buscar facturas del agente por folio (para el buscador) ──
    buscarFacturasAgente: async (id_agente: string, busqueda: string) => {
        const { Op } = await import('sequelize');
        return await Facturas.findAll({
            where: {
                tipo_cfdi: 'I',
                estatus_factura: { [Op.ne]: 'CAN' },
                folio_factura: { [Op.iLike]: `%${busqueda}%` },
            },
            include: [{
                model: Pedido_Almacen,
                where: { id_agente_pedido_alm: id_agente },
                required: true,
                attributes: ['cod_int_pedido_alm'],
            }],
            attributes: ['id_factura', 'folio_factura', 'fecha_emision', 'total_factura'],
            limit: 20,
            order: [['fecha_emision', 'DESC']],
        });
    },
};

// ── Helpers internos ──────────────────────────────────────────────────────────

async function getClienteFromFactura(id_factura: string, t: any): Promise<string> {
    const factura = await Facturas.findByPk(id_factura, {
        attributes: ['id_cliente_alm'],
        transaction: t,
    });
    if (!factura || !factura.id_cliente_alm) {
        throw new Error('No se pudo determinar el cliente de la factura para generar la nota de crédito.');
    }
    return factura.id_cliente_alm;
}

// Registra la entrada física de mercancía devuelta reutilizando el lote original.
//
// Flujo por cada artículo devuelto:
//   1. Busca el lote con que salió en el pedido original
//      (detalle_pedido_almacen → detalle_pedido_almacen_lote)
//   2. Si lo encuentra:
//      a. Hace UPSERT en stock_ubicacion_lote (id_ubicacion = null → pendiente de ubicar)
//      b. Registra ENTRADA en kardex
//   3. Si el artículo no tiene lote registrado en el pedido → se omite (no es artículo de inventario)
//
async function registrarEntradaMercancia(params: {
    detalles: import('../model/Devolucion_Cliente_Detalle.model').default[];
    id_pedido_alm: string;
    id_devolucion_cliente: string;
    id_empleado_aprueba: string;
    folio_factura: string;
    t: Transaction;
}) {
    const { detalles, id_pedido_alm, id_devolucion_cliente, id_empleado_aprueba, folio_factura, t } = params;

    // Obtener la empresa principal (siempre es la misma en este sistema)
    const empresa = await Empresa_SucursalRepository.getEmpresaPrincipal();
    if (!empresa) throw new Error('No se encontró la empresa para registrar entrada de mercancía.');
    const id_empresa = (empresa as any).id_empre as string;

    // Artículos con id_articulo (los genéricos sin id se omiten)
    const detallesConArticulo = detalles.filter(d => d.id_articulo);
    if (!detallesConArticulo.length) return;

    // Obtener los lotes originales del pedido para cada artículo devuelto
    const articulosIds = detallesConArticulo.map(d => `'${d.id_articulo}'`).join(', ');
    const lotesOriginales = await dbLocal.query<{
        id_articulo: string;
        id_lote_sucursal: string;
        cantidad_total: string;
    }>(`
        SELECT
            dpa.id_articulo,
            dpal.id_lote_sucursal,
            SUM(dpal.cantidad) AS cantidad_total
        FROM detalle_pedido_almacen      dpa
        JOIN detalle_pedido_almacen_lote dpal
            ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
        WHERE dpa.id_pedido_almacen = :id_pedido_alm
          AND dpa.id_articulo IN (${articulosIds})
        GROUP BY dpa.id_articulo, dpal.id_lote_sucursal
        ORDER BY SUM(dpal.cantidad) DESC
    `, {
        replacements: { id_pedido_alm },
        type: QueryTypes.SELECT,
        transaction: t,
    });

    // Mapa: id_articulo → id_lote_sucursal (primer lote = el de mayor cantidad)
    const loteMap = new Map<string, string>();
    for (const row of lotesOriginales) {
        if (!loteMap.has(row.id_articulo)) {
            loteMap.set(row.id_articulo, row.id_lote_sucursal);
        }
    }

    const now = new Date();

    for (const det of detallesConArticulo) {
        const id_lote = loteMap.get(det.id_articulo!);
        if (!id_lote) continue; // artículo sin lote registrado → omitir

        const cantidad = Number(det.cantidad_devolucion);

        // ── Upsert stock_ubicacion_lote (sin ubicación = pendiente de ubicar) ──
        const [stockRow] = await Stock_Ubicacion_Lote.findOrCreate({
            where: {
                id_lote,
                id_articulo: det.id_articulo!,
                id_empresa_sucursal: id_empresa,
                id_ubicacion_sucursal: null,
            },
            defaults: {
                id_stock_ubicacion_lote: uuidv4(),
                id_lote,
                id_articulo: det.id_articulo!,
                id_empresa_sucursal: id_empresa,
                id_ubicacion_sucursal: null,
                cantidad: 0,
                cantidad_apartada: 0,
            },
            transaction: t,
        });

        await stockRow.update(
            { cantidad: Number(stockRow.cantidad) + cantidad },
            { transaction: t }
        );

        // ── Movimiento kardex ENTRADA ──────────────────────────────────────
        await Kardex_Movimientos_Articulos.create({
            id_kardex_movimientos: uuidv4(),
            id_empresa,
            fecha: now,
            id_articulo: det.id_articulo!,
            id_lote,
            tipo_movimiento: 'ENTRADA',
            categoria: 'Entrada_Salida',
            id_origen_ubicacion: null,
            id_destino_ubicacion: null,
            cantidad_movimiento: cantidad,
            documento_ref: id_devolucion_cliente,
            id_pedido: null,
            id_empleado: id_empleado_aprueba,
            notas: `Devolución recibida · Sin ubicar · Factura ${folio_factura}`,
        }, { transaction: t });
    }
}
