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
import Detalle_Remision from '../../../Finanzas/Remisiones/model/Detalle_Remision.model';
import Pago_CxC from '../../../Finanzas/Cuentas_Por_Cobrar/model/Pago_CxC.model';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Kardex_Movimientos_Articulos from '../../../Almacen/Kardex/model/Kardex_Movimientos_Articulos';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { timbraDevolucionEgreso } from '../helpers/Devolucion_Egreso.helper';
import Agente_Inventario_Virtual from '../model/Agente_Inventario_Virtual.model';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Devolucion_Cliente_Lote_Manual from '../model/Devolucion_Cliente_Lote_Manual.model';

/** Renglón de una factura anterior cuya mercancía regresó físicamente (lote y caducidad capturados a mano) */
export interface IEntradaManualDevolucion {
    id_articulo: string;
    descripcion: string;
    cantidad: number;
    /** Obligatorios si la mercancía se recibe en almacén; opcionales si queda en el inventario virtual del agente */
    numero_lote?: string;
    fecha_caducidad?: string;   // YYYY-MM-DD
}

export const DevolucionClienteRepository = {

    // ── Crear solicitud de devolución completa (cabecera + detalles) ──
    create: async (data: IDevolucionClienteCreate) => {
        const t = await dbLocal.transaction();
        try {
            const id_devolucion_cliente = uuidv4();

            await Devolucion_Cliente.create({
                id_devolucion_cliente,
                id_factura: data.id_factura ?? null,
                id_remision: data.id_remision ?? null,
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
                { model: Remision, attributes: ['folio_remision', 'fecha_remision', 'total_remision'] },
                { model: Devolucion_Cliente_Detalle },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    // ── Mis devoluciones con lo necesario para imprimir/reimprimir el ticket ──
    //    Agrega a cada devolución el nombre del cliente y a cada renglón la tasa de IVA que tuvo en la factura
    //    (la devolución solo guarda el subtotal), para poder mostrar subtotal + IVA + total igual que al crearla.
    getByAgenteParaTicket: async (id_agente: string) => {
        const lista = await DevolucionClienteRepository.getByAgente(id_agente);
        if (lista.length === 0) return [];

        const idsFactura = Array.from(new Set(lista.map((d: any) => d.id_factura).filter(Boolean)));
        const clientes = idsFactura.length
            ? await dbLocal.query<any>(`
                SELECT f.id_factura, c.razon_social_cliente_alm AS cliente
                FROM facturas f
                LEFT JOIN cliente_almacen c ON c.id_cliente_alm = f.id_cliente_alm
                WHERE f.id_factura IN (:ids)
            `, { replacements: { ids: idsFactura }, type: QueryTypes.SELECT })
            : [];
        const tasas = idsFactura.length
            ? await Detalle_Factura.findAll({
                where: { id_factura: idsFactura },
                attributes: ['id_factura', 'id_articulo', 'tasa_iva'],
                raw: true,
            }) as any[]
            : [];

        const clientePorFactura = new Map<string, string>(clientes.map((c: any) => [c.id_factura, c.cliente]));
        const tasaPorRenglon = new Map<string, number>(
            tasas.map((t: any) => [`${t.id_factura}|${t.id_articulo}`, Number(t.tasa_iva ?? 0)])
        );

        // Devoluciones de REMISIONES (sin factura): cliente y tasa de IVA salen de la remisión
        const idsRemision = Array.from(new Set(lista.map((d: any) => d.id_remision).filter(Boolean)));
        const clientesRem = idsRemision.length
            ? await dbLocal.query<any>(`
                SELECT r.id_remision, c.razon_social_cliente_alm AS cliente
                FROM remision r
                LEFT JOIN cliente_almacen c ON c.id_cliente_alm = r.id_cliente_alm
                WHERE r.id_remision IN (:ids)
            `, { replacements: { ids: idsRemision }, type: QueryTypes.SELECT })
            : [];
        const tasasRem = idsRemision.length
            ? await Detalle_Remision.findAll({
                where: { id_remision: idsRemision },
                attributes: ['id_remision', 'id_articulo', 'tasa_iva'],
                raw: true,
            }) as any[]
            : [];
        const clientePorRemision = new Map<string, string>(clientesRem.map((c: any) => [c.id_remision, c.cliente]));
        const tasaPorRenglonRem = new Map<string, number>(
            tasasRem.map((t: any) => [`${t.id_remision}|${t.id_articulo}`, Number(t.tasa_iva ?? 0)])
        );

        return lista.map((d: any) => {
            const json = d.toJSON();
            const detalles = json.detalles ?? json.Devolucion_Cliente_Detalles ?? [];
            const conTasa = detalles.map((x: any) => ({
                ...x,
                tasa_iva: json.id_remision
                    ? (tasaPorRenglonRem.get(`${json.id_remision}|${x.id_articulo}`) ?? 0)
                    : (tasaPorRenglon.get(`${json.id_factura}|${x.id_articulo}`) ?? 0),
            }));
            if (json.detalles) json.detalles = conTasa;
            if (json.Devolucion_Cliente_Detalles) json.Devolucion_Cliente_Detalles = conTasa;
            json.cliente_nombre = json.id_remision
                ? (clientePorRemision.get(json.id_remision) ?? null)
                : (clientePorFactura.get(json.id_factura) ?? null);
            return json;
        });
    },

    // ── Una devolución específica con todos sus detalles ──
    getById: async (id_devolucion_cliente: string) => {
        return await Devolucion_Cliente.findByPk(id_devolucion_cliente, {
            include: [
                { model: Facturas, attributes: ['folio_factura', 'fecha_emision', 'total_factura'] },
                { model: Remision, attributes: ['folio_remision', 'fecha_remision', 'total_remision'] },
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
        const factura = await Facturas.findByPk(id_factura, {
            attributes: ['id_factura', 'folio_factura', 'fecha_emision', 'total_factura', 'estatus_factura', 'id_cliente_alm', 'id_pedido_alm'],
            include: [{ model: Detalle_Factura }],
        });

        if (!factura) return factura;

        // Obtener lotes originales del pedido para cada artículo de la factura
        let lotesMap: Record<string, { num_lote: string; fecha_caducidad: string | null }[]> = {};
        if (factura.id_pedido_alm) {
            const rows = await dbLocal.query<{
                id_articulo: string;
                num_lote: string;
                fecha_caducidad: string | null;
            }>(`
                SELECT
                    dpa.id_articulo,
                    COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS num_lote,
                    COALESCE(dpal.lote_factura_fecha,  las.fecha_venci_lote_sucursal) AS fecha_caducidad
                FROM detalle_pedido_almacen dpa
                JOIN detalle_pedido_almacen_lote dpal
                    ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                LEFT JOIN lote_articulo_sucursal las
                    ON las.id_lote_sucursal = dpal.id_lote_sucursal
                WHERE dpa.id_pedido_almacen = :id_pedido_almacen
                ORDER BY dpa.id_articulo, dpal.cantidad DESC
            `, {
                replacements: { id_pedido_almacen: factura.id_pedido_alm },
                type: QueryTypes.SELECT,
            });

            for (const r of rows) {
                if (!lotesMap[r.id_articulo]) lotesMap[r.id_articulo] = [];
                // Evitar duplicados
                const yaExiste = lotesMap[r.id_articulo].some(l => l.num_lote === r.num_lote);
                if (!yaExiste && r.num_lote) {
                    lotesMap[r.id_articulo].push({ num_lote: r.num_lote, fecha_caducidad: r.fecha_caducidad });
                }
            }
        }

        // Adjuntar lotes a cada detalle de factura
        const plain = factura.toJSON() as any;
        plain.detalles = (plain.detalles ?? []).map((d: any) => ({
            ...d,
            lotes: lotesMap[d.id_articulo] ?? [],
        }));

        return plain;
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
            if (filtros.fecha_inicio) where['fecha_solicitud'][Op.gte] = filtros.fecha_inicio + ' 00:00:00';
            if (filtros.fecha_fin) where['fecha_solicitud'][Op.lte] = filtros.fecha_fin + ' 23:59:59';
        }
        const devoluciones = await Devolucion_Cliente.findAll({
            where,
            include: [
                { model: Facturas, attributes: ['folio_factura', 'fecha_emision', 'total_factura'] },
                { model: Remision, attributes: ['folio_remision', 'fecha_remision', 'total_remision'] },
                {
                    model: Agente_De_Venta,
                    include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }],
                },
                { model: Devolucion_Cliente_Detalle },
            ],
            order: [['createdAt', 'DESC']],
        });
        if (!devoluciones.length) return devoluciones;

        // Mercancía que quedó en el inventario virtual del agente: qué se ha recibido en almacén, cuándo y quién
        const virtuales = await dbLocal.query<any>(`
            SELECT v.id_inventario_virtual, v.id_devolucion_cliente, v.descripcion_articulo, v.cantidad, v.estatus,
                   v."createdAt" AS fecha, v.fecha_recibido,
                   l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                   NULLIF(TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado)), '') AS recibio
            FROM agente_inventario_virtual v
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = v.id_lote
            LEFT JOIN empleado e ON e.id_empleado = v.id_empleado_recibe
            WHERE v.id_devolucion_cliente IN (:ids)
            ORDER BY v."createdAt" ASC`,
            { replacements: { ids: devoluciones.map(d => d.id_devolucion_cliente) }, type: QueryTypes.SELECT });
        const porDev = new Map<string, any[]>();
        for (const v of virtuales) {
            const l = porDev.get(String(v.id_devolucion_cliente)) ?? [];
            l.push({
                id_inventario_virtual: v.id_inventario_virtual,
                descripcion_articulo: v.descripcion_articulo,
                cantidad: Number(v.cantidad) || 0,
                estatus: v.estatus,
                fecha: v.fecha,
                fecha_recibido: v.fecha_recibido ?? null,
                numero_lote: v.numero_lote_sucursal ? String(v.numero_lote_sucursal).trim() : null,
                fecha_vencimiento: v.fecha_venci_lote_sucursal ?? null,
                recibio: v.recibio ?? null,
            });
            porDev.set(String(v.id_devolucion_cliente), l);
        }

        // Lote y caducidad con los que salió cada artículo en la factura (los del pedido surtido; si la línea trae un
        // lote de factura capturado a mano —lotes migrados— se usa ese)
        // (las devoluciones de REMISIÓN no tienen id_factura: no deben entrar aquí como la cadena "null")
        const idsFactura = Array.from(new Set(devoluciones.filter(d => d.id_factura).map(d => String(d.id_factura))));
        const lotesFactura = idsFactura.length ? await dbLocal.query<any>(`
            SELECT f.id_factura, dpa.id_articulo,
                   COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS lote,
                   COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal) AS caducidad,
                   SUM(dpal.cantidad) AS cantidad
            FROM facturas f
            JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = f.id_pedido_alm
            JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
            LEFT JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
            WHERE f.id_factura IN (:ids) AND dpal.cantidad > 0
            GROUP BY f.id_factura, dpa.id_articulo, COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal),
                     COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal)
            ORDER BY caducidad ASC`,
            { replacements: { ids: idsFactura }, type: QueryTypes.SELECT }) : [];
        const lotesPorLinea = new Map<string, { numero_lote: string; caducidad: string | null; cantidad: number }[]>();
        for (const l of lotesFactura) {
            const k = `${l.id_factura}|${l.id_articulo}`;
            const lista = lotesPorLinea.get(k) ?? [];
            lista.push({ numero_lote: String(l.lote ?? '').trim(), caducidad: l.caducidad ?? null, cantidad: Number(l.cantidad) || 0 });
            lotesPorLinea.set(k, lista);
        }

        // Código de barras de cada artículo y tasa de IVA que tuvo en la factura. Los renglones de una devolución guardan el precio
        // SIN IVA; en una factura anterior (sin detalle) el monto capturado ya trae el IVA.
        const idsArtic = Array.from(new Set(devoluciones.flatMap(d => (d.detalles ?? []).map(x => x.id_articulo).filter(Boolean) as string[])));
        const barras = idsArtic.length ? await dbLocal.query<any>(
            `SELECT id_artic, cod_barr_artic FROM articulo WHERE id_artic IN (:ids)`,
            { replacements: { ids: idsArtic }, type: QueryTypes.SELECT }) : [];
        const barrasPor = new Map<string, string>(barras.map((b: any) => [String(b.id_artic), String(b.cod_barr_artic ?? '').trim()]));
        const tasas = idsFactura.length ? await dbLocal.query<any>(
            `SELECT id_factura, id_articulo, MAX(tasa_iva) AS tasa FROM detalle_factura WHERE id_factura IN (:ids) GROUP BY id_factura, id_articulo`,
            { replacements: { ids: idsFactura }, type: QueryTypes.SELECT }) : [];
        const facturasConDetalle = new Set<string>(tasas.map((t: any) => String(t.id_factura)));
        const tasaPor = new Map<string, number>(tasas.map((t: any) => [`${t.id_factura}|${t.id_articulo}`, Number(t.tasa) || 0]));
        const r2 = (n: number) => Math.round(n * 100) / 100;

        // Tasa de IVA de las remisiones (devoluciones de remisión sin CFDI)
        const idsRemision = Array.from(new Set(devoluciones.filter(d => d.id_remision).map(d => String(d.id_remision))));
        const tasasRem = idsRemision.length ? await dbLocal.query<any>(
            `SELECT id_remision, id_articulo, MAX(tasa_iva) AS tasa FROM detalle_remision WHERE id_remision IN (:ids) GROUP BY id_remision, id_articulo`,
            { replacements: { ids: idsRemision }, type: QueryTypes.SELECT }) : [];
        const tasaPorRem = new Map<string, number>(tasasRem.map((t: any) => [`${t.id_remision}|${t.id_articulo}`, Number(t.tasa) || 0]));

        // Lote y caducidad con los que salió cada artículo de la remisión (los del pedido surtido), igual que en las facturas
        const lotesRem = idsRemision.length ? await dbLocal.query<any>(`
            SELECT r.id_remision, dpa.id_articulo,
                   COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS lote,
                   COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal) AS caducidad,
                   SUM(dpal.cantidad) AS cantidad
            FROM remision r
            JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = r.id_pedido_alm
            JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
            LEFT JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
            WHERE r.id_remision IN (:ids) AND dpal.cantidad > 0
            GROUP BY r.id_remision, dpa.id_articulo, COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal),
                     COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal)
            ORDER BY caducidad ASC`,
            { replacements: { ids: idsRemision }, type: QueryTypes.SELECT }) : [];
        const lotesPorLineaRem = new Map<string, { numero_lote: string; caducidad: string | null; cantidad: number }[]>();
        for (const l of lotesRem) {
            const k = `${l.id_remision}|${l.id_articulo}`;
            const lista = lotesPorLineaRem.get(k) ?? [];
            lista.push({ numero_lote: String(l.lote ?? '').trim(), caducidad: l.caducidad ?? null, cantidad: Number(l.cantidad) || 0 });
            lotesPorLineaRem.set(k, lista);
        }

        return devoluciones.map(d => {
            const plano = d.toJSON() as any;
            const esRemision = !!d.id_remision;
            const conDetalle = esRemision ? true : facturasConDetalle.has(String(d.id_factura));
            const detalles = (plano.detalles ?? []).map((x: any) => {
                const tasa = conDetalle && x.id_articulo
                    ? (esRemision ? (tasaPorRem.get(`${d.id_remision}|${x.id_articulo}`) ?? 0) : (tasaPor.get(`${d.id_factura}|${x.id_articulo}`) ?? 0))
                    : 0;
                const subtotal = Number(x.subtotal_devolucion) || 0;
                const iva = r2(subtotal * tasa);
                return {
                    ...x,
                    lotes_factura: x.id_articulo
                        ? ((esRemision ? lotesPorLineaRem.get(`${d.id_remision}|${x.id_articulo}`) : lotesPorLinea.get(`${d.id_factura}|${x.id_articulo}`)) ?? [])
                        : [],
                    cod_barr_artic: x.id_articulo ? (barrasPor.get(String(x.id_articulo)) ?? null) : null,
                    tasa_iva: tasa,
                    importe_iva: iva,
                    total_linea: r2(subtotal + iva),
                    iva_incluido: !conDetalle,
                };
            });
            const subtotal = r2(detalles.reduce((s: number, x: any) => s + (Number(x.subtotal_devolucion) || 0), 0));
            const iva = r2(detalles.reduce((s: number, x: any) => s + x.importe_iva, 0));
            return {
                ...plano,
                inventario_virtual: porDev.get(String(d.id_devolucion_cliente)) ?? [],
                detalles,
                totales: { subtotal, iva, total: r2(subtotal + iva), iva_incluido: !conDetalle },
            };
        }) as any;
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
        id_empresa?: string,
        opciones?: { descontar_cxc?: boolean; entradas_manual?: IEntradaManualDevolucion[] },
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

        // Si se registró contra una factura que nació de una remisión sin CFDI (Público General), es la misma venta:
        // se resuelve por la remisión (nota de crédito interna), no se timbra un egreso.
        if (!dev.id_remision && dev.id_factura) {
            const rem = await DevolucionClienteRepository.remisionSinCfdiDeFactura(dev.id_factura);
            if (rem) {
                await dev.update({ id_remision: rem.id_remision, id_factura: null as any });
            }
        }

        // Devolución de una REMISIÓN sin CFDI: no se timbra nada, se resuelve con nota de crédito interna
        if (dev.id_remision) {
            return await aprobarDevolucionRemision(dev, id_empleado_aprueba, recibio_mercancia, id_empresa);
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
        // Factura VIEJA (migrada o de Público General): no tiene detalle de artículos, así que el
        // CFDI-E se arma solo por el monto devuelto, repartido en sus tasas de IVA.
        const esFacturaVieja = (await Detalle_Factura.count({ where: { id_factura: dev.id_factura } })) === 0;
        // Factura anterior: el lote y la caducidad capturados al registrar la solicitud se guardan con ella; si no vienen
        // en esta llamada se toman de ahí.
        let entradas_manual = opciones?.entradas_manual;
        if (esFacturaVieja && !entradas_manual?.length) {
            const guardados = await Devolucion_Cliente_Lote_Manual.findAll({
                where: { id_devolucion_cliente }, raw: true,
            }) as any[];
            if (guardados.length) {
                entradas_manual = dev.detalles.filter(d => d.id_articulo).map(d => {
                    const g = guardados.find(x => x.id_articulo === d.id_articulo);
                    return {
                        id_articulo: d.id_articulo as string,
                        descripcion: d.descripcion_articulo,
                        cantidad: Number(d.cantidad_devolucion),
                        numero_lote: g?.numero_lote,
                        fecha_caducidad: g?.fecha_caducidad ? String(g.fecha_caducidad).slice(0, 10) : undefined,
                    };
                });
            }
        }
        // Para dar entrada al almacén todos los artículos necesitan lote y caducidad
        if (esFacturaVieja && recibio_mercancia && dev.detalles.some(d => d.id_articulo)) {
            const completas = (entradas_manual ?? []).filter(e => e.numero_lote && e.fecha_caducidad);
            const conArticulo = dev.detalles.filter(d => d.id_articulo).length;
            if (!completas.length || completas.length < conArticulo) {
                throw Object.assign(new Error(
                    'Esta devolución es de una factura anterior y le faltan lote o caducidad en algún artículo: no se puede dar ' +
                    'entrada al almacén. Apruébala como "No se recibió" (queda en el inventario virtual del agente, donde después ' +
                    'puedes asignarles el lote) o recházala y vuelve a capturarla con sus lotes.'), { status: 400 });
            }
        }
        const egreso = await timbraDevolucionEgreso({
            id_factura: dev.id_factura,
            detalles: dev.detalles,
            id_empresa,
            solo_total: esFacturaVieja ? monto_devolucion : undefined,
        });

        // Lo que de verdad se le devuelve al cliente, CON IVA: lo mismo que el CFDI de egreso. En facturas con detalle, los renglones
        // de la devolución guardan el precio SIN IVA (como la factura), así que sumarlos deja fuera el IVA y la cuenta por cobrar
        // (o la nota de crédito) quedaba corta contra el egreso. En facturas viejas el monto capturado ya trae IVA.
        const monto_con_iva = esFacturaVieja
            ? monto_devolucion
            : Math.round(Number(egreso.total) * 100) / 100;

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
            // En facturas viejas, por defecto SIEMPRE nota de crédito (solo descuenta la CxC si se pidió)
            const aplicarCxc = !esFacturaVieja || opciones?.descontar_cxc === true;
            if (aplicarCxc && cxc && cxc.estatus_cxc !== 'PAG') {
                // Si la devolución es mayor al saldo vivo de la factura, solo se descuenta el saldo y lo que sobra
                // queda como nota de crédito a favor del cliente (para otra factura), igual que una NC normal.
                const saldo_actual = Math.max(0, Number(cxc.saldo_pendiente));
                const monto_aplicado = Math.round(Math.min(saldo_actual, monto_con_iva) * 100) / 100;
                const sobrante = Math.round((monto_con_iva - monto_aplicado) * 100) / 100;
                const nuevo_saldo = Math.max(0, saldo_actual - monto_aplicado);
                const nuevo_total = Math.max(0, Number(cxc.monto_total) - monto_aplicado);
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
                    monto_pago: monto_aplicado,
                    fecha_pago: new Date(),
                    numero_recibo: `DEV-${id_devolucion_cliente.slice(0, 8)}`,
                    referencia_pago: `DEV-FOLIO-${egreso.folio}`,
                    id_empleado_captura: id_empleado_aprueba,
                    id_empleado_aplica: id_empleado_aprueba,
                    fecha_aplicado: new Date(),
                    notas: `Descuento automático — devolución aprobada. CFDI-E folio: ${egreso.folio}`,
                    estatus_pago: 'DEV',
                }, { transaction: t });

                if (sobrante > 0.009) {
                    const id_cliente_sobrante = facturaIncludes?.id_cliente_alm
                        ?? await getClienteFromFactura(dev.id_factura, t);
                    await Nota_Credito_Cliente.create({
                        id_nota_credito: uuidv4(),
                        id_cliente_alm: id_cliente_sobrante,
                        id_devolucion_cliente: dev.id_devolucion_cliente,
                        monto_original: sobrante,
                        saldo_disponible: sobrante,
                        estatus: 'DISPONIBLE',
                        concepto: `Saldo a favor de devolución · Factura: ${folio_factura} (excedió el saldo pendiente)`,
                        uuid_cfdi_egreso: null,
                    }, { transaction: t });
                }

                resultado_aprobacion = 'DESCUENTO_CXC';
                id_cxc_afectada = cxc.id_cxc;
            } else {
                const concepto = esFacturaVieja
                    ? `Devolución de factura anterior (solo total) · Factura: ${folio_factura}`
                    : `Devolución aprobada · Factura: ${folio_factura}`;
                const id_cliente_alm = facturaIncludes?.id_cliente_alm
                    ?? await getClienteFromFactura(dev.id_factura, t);

                await Nota_Credito_Cliente.create({
                    id_nota_credito: uuidv4(),
                    id_cliente_alm,
                    id_devolucion_cliente: dev.id_devolucion_cliente,
                    monto_original: monto_con_iva,
                    saldo_disponible: monto_con_iva,
                    estatus: 'DISPONIBLE',
                    concepto,
                    uuid_cfdi_egreso: null,
                }, { transaction: t });

                resultado_aprobacion = 'NOTA_CREDITO';
            }

            // ── 5B. Mercancía ─────────────────────────────────────────────
            //   · Recibida en almacén  → stock SIN UBICACIÓN (+ Kardex)
            //   · NO recibida          → inventario virtual del agente (no es stock disponible)
            //   · Factura vieja        → sin pedido ni lotes: solo entra si se capturó lote y caducidad a mano
            let inventario_virtual = false;
            let entradas_manuales = 0;
            if (esFacturaVieja) {
                if (recibio_mercancia && entradas_manual?.length) {
                    entradas_manuales = await registrarEntradaManual({
                        entradas: entradas_manual,
                        id_devolucion_cliente: dev.id_devolucion_cliente,
                        id_empleado_aprueba,
                        folio_factura,
                        id_empresa: id_empresa ?? '',
                        t,
                    });
                } else if (!recibio_mercancia) {
                    // No llegó al almacén: queda en el inventario virtual del agente (los artículos del catálogo).
                    // Si se capturó lote y caducidad se deja el lote ligado, para poderlo recibir después.
                    const conArticulo = dev.detalles.filter(d => d.id_articulo && Number(d.cantidad_devolucion) > 0);
                    if (conArticulo.length) {
                        const lotePorArticulo = new Map<string, string>();
                        for (const e of entradas_manual ?? []) {
                            const numero = String(e.numero_lote ?? '').trim();
                            const cad = String(e.fecha_caducidad ?? '').slice(0, 10);
                            if (!e.id_articulo || !numero || !/^\d{4}-\d{2}-\d{2}$/.test(cad)) continue;
                            const lote = await obtenerOCrearLote(e.id_articulo, id_empresa ?? '', numero, cad, Number(e.cantidad) || 0, t);
                            if (!lotePorArticulo.has(e.id_articulo)) lotePorArticulo.set(e.id_articulo, lote.id_lote_sucursal);
                        }
                        await Agente_Inventario_Virtual.bulkCreate(conArticulo.map(d => ({
                            id_inventario_virtual: uuidv4(),
                            id_empresa: id_empresa ?? '',
                            id_agente: dev.id_agente,
                            id_devolucion_cliente: dev.id_devolucion_cliente,
                            id_articulo: d.id_articulo!,
                            id_lote: lotePorArticulo.get(d.id_articulo!) ?? null,
                            descripcion_articulo: d.descripcion_articulo,
                            cantidad: Number(d.cantidad_devolucion),
                            folio_factura,
                            estatus: 'EN_AGENTE',
                        })) as any, { transaction: t });
                        inventario_virtual = true;
                    }
                }
            } else {
                if (recibio_mercancia && id_pedido_alm) {
                    await registrarEntradaMercancia({
                        detalles: dev.detalles,
                        id_pedido_alm,
                        id_devolucion_cliente: dev.id_devolucion_cliente,
                        id_empleado_aprueba,
                        folio_factura,
                        id_empresa: id_empresa ?? '',
                        t,
                    });
                } else if (!recibio_mercancia) {
                    inventario_virtual = (await registrarInventarioVirtual({
                        detalles: dev.detalles,
                        id_pedido_alm,
                        id_devolucion_cliente: dev.id_devolucion_cliente,
                        id_agente: dev.id_agente,
                        folio_factura,
                        id_empresa: id_empresa ?? '',
                        t,
                    })) > 0;
                }
            }

            // ── 5C. Actualizar devolución ────────────────────────────────
            await dev.update({
                estatus: 'APROBADA',
                resultado_aprobacion,
                id_cxc_afectada,
                uuid_cfdi_egreso: null,
                id_factura_egreso: egreso.id_factura_egreso,
                recibio_mercancia,
                fecha_recepcion_mercancia: recibio_mercancia ? new Date() : null,
            }, { transaction: t });

            await t.commit();
            return { dev, resultado_aprobacion, monto_devolucion: monto_con_iva, egreso, recibio_mercancia, es_factura_vieja: esFacturaVieja, es_remision: false, inventario_virtual, entradas_manuales };

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

    // ═══════════════ REMISIONES (sin CFDI) ═══════════════════════════════════════════════════════

    // ── Cantidades ya devueltas por artículo en una REMISIÓN (PENDIENTE o APROBADA; las rechazadas no cuentan) ──
    getCantidadesYaDevueltasRemision: async (id_remision: string): Promise<Record<string, number>> => {
        const filas = await dbLocal.query<any>(`
            SELECT d.id_articulo, SUM(d.cantidad_devolucion)::float AS cantidad
            FROM devolucion_cliente_detalle d
            JOIN devolucion_cliente dc ON dc.id_devolucion_cliente = d.id_devolucion_cliente
            WHERE dc.id_remision = :id AND dc.estatus IN ('PENDIENTE', 'APROBADA') AND d.id_articulo IS NOT NULL
            GROUP BY d.id_articulo
        `, { replacements: { id: id_remision }, type: QueryTypes.SELECT });
        const mapa: Record<string, number> = {};
        for (const f of filas) mapa[String(f.id_articulo)] = Number(f.cantidad) || 0;
        return mapa;
    },

    // ── Remisión con sus artículos (para llenar el formulario de devolución), con la misma forma que la factura ──
    getRemisionConDetalles: async (id_remision: string) => {
        const rem = await Remision.findByPk(id_remision, {
            attributes: ['id_remision', 'folio_remision', 'fecha_remision', 'total_remision', 'estatus_remision', 'id_cliente_alm', 'id_pedido_alm', 'id_factura'],
        });
        if (!rem) return null;

        const detalles = await Detalle_Remision.findAll({ where: { id_remision }, raw: true }) as any[];

        // Lotes originales del pedido por artículo (para saber a qué lote regresa la mercancía)
        const lotesMap: Record<string, { num_lote: string; fecha_caducidad: string | null }[]> = {};
        if (rem.id_pedido_alm) {
            const rows = await dbLocal.query<any>(`
                SELECT dpa.id_articulo,
                       COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS num_lote,
                       COALESCE(dpal.lote_factura_fecha,  las.fecha_venci_lote_sucursal) AS fecha_caducidad
                FROM detalle_pedido_almacen dpa
                JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                LEFT JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
                WHERE dpa.id_pedido_almacen = :id
                ORDER BY dpa.id_articulo, dpal.cantidad DESC
            `, { replacements: { id: rem.id_pedido_alm }, type: QueryTypes.SELECT });
            for (const r of rows) {
                if (!lotesMap[r.id_articulo]) lotesMap[r.id_articulo] = [];
                if (r.num_lote && !lotesMap[r.id_articulo].some(l => l.num_lote === r.num_lote)) {
                    lotesMap[r.id_articulo].push({ num_lote: r.num_lote, fecha_caducidad: r.fecha_caducidad });
                }
            }
        }

        return {
            tipo: 'REMISION' as const,
            id_remision: rem.id_remision,
            folio_remision: rem.folio_remision,
            folio_factura: `REM-${rem.folio_remision}`,        // el formulario muestra este texto como "folio"
            fecha_emision: rem.fecha_remision,
            total_factura: Number(rem.total_remision),
            estatus_remision: rem.estatus_remision,
            id_cliente_alm: rem.id_cliente_alm,
            id_pedido_alm: rem.id_pedido_alm,
            id_factura: rem.id_factura,                         // lleno = viene de una factura de Público General
            detalles: detalles.map(d => ({
                id_articulo: d.id_articulo,
                descripcion_articulo: d.descripcion_articulo,
                cantidad_facturada: Number(d.cantidad),
                precio_artic: Number(d.precio_unitario),
                tasa_iva: Number(d.tasa_iva ?? 0),
                lotes: lotesMap[d.id_articulo] ?? [],
            })),
        };
    },

    // ── Buscador del agente: facturas Y remisiones sin CFDI, por folio ──
    //    Un agente ve los documentos de sus pedidos y de los clientes que tiene asignados hoy.
    //    Una remisión que viene de una factura de Público General (id_factura lleno) se devuelve por esa factura.
    buscarDocumentosAgente: async (id_agente: string, busqueda: string) => {
        const facturas = await DevolucionClienteRepository.buscarFacturasAgente(id_agente, busqueda);
        const items: any[] = facturas.map((f: any) => ({ ...(typeof f.toJSON === 'function' ? f.toJSON() : f), tipo: 'FACTURA' }));

        // Una remisión se encuentra por su folio ("581", "REM-581", "rem 581") o por el folio de la factura que nació de ella
        // al cobrar (esas facturas no se ofrecen aparte: son la misma venta y se devuelven por la remisión).
        const m = busqueda.trim().match(/^(?:rem(?:isi[oó]n)?)?\s*-?\s*(\d{1,9})$/i);
        if (/^[0-9a-f-]{36}$/i.test(id_agente)) {
            const remisiones = await dbLocal.query<any>(`
                SELECT r.id_remision, r.folio_remision, r.fecha_remision, r.total_remision, r.estatus_remision,
                       c.razon_social_cliente_alm AS cliente,
                       (SELECT x.saldo_pendiente FROM cuenta_por_cobrar x WHERE x.id_remision = r.id_remision
                         ORDER BY x."createdAt" DESC LIMIT 1) AS saldo,
                       (SELECT STRING_AGG(f.folio_factura, ', ' ORDER BY f.folio_factura) FROM facturas f
                         WHERE f.id_pedido_alm = r.id_pedido_alm AND f.tipo_cfdi = 'I' AND f.estatus_factura <> 'CAN') AS facturas_origen
                FROM remision r
                JOIN cliente_almacen c ON c.id_cliente_alm = r.id_cliente_alm
                WHERE r.id_factura IS NULL AND r.estatus_remision <> 'CAN'
                  AND (r.id_agente = :ag OR c.id_agente_cliente_alm = :ag)
                  AND (
                        (CAST(:qr AS TEXT) IS NOT NULL AND CAST(r.folio_remision AS TEXT) LIKE CAST(:qr AS TEXT))
                        OR EXISTS (SELECT 1 FROM facturas f
                                   WHERE f.id_pedido_alm = r.id_pedido_alm AND f.tipo_cfdi = 'I'
                                     AND f.estatus_factura <> 'CAN' AND f.folio_factura ILIKE :qf)
                      )
                ORDER BY r.fecha_remision DESC
                LIMIT 20
            `, { replacements: { ag: id_agente, qr: m ? `${m[1]}%` : null, qf: `%${busqueda}%` }, type: QueryTypes.SELECT });
            for (const r of remisiones) {
                items.push({
                    tipo: 'REMISION',
                    id_remision: r.id_remision,
                    id_factura: null,
                    folio_factura: `REM-${r.folio_remision}`,
                    fecha_emision: r.fecha_remision,
                    total_factura: Number(r.total_remision),
                    saldo: r.saldo == null ? null : Number(r.saldo),
                    facturas_origen: r.facturas_origen ?? null,
                    cliente: r.cliente ?? null,
                });
            }
        }
        return items;
    },

    // ── ADMIN: buscar facturas por folio o cliente (sin restringir al agente) ──
    //    n_detalles = 0 → factura vieja (migrada): solo se puede hacer nota de crédito por el total.
    buscarFacturasAdmin: async (busqueda: string) => {
        return await dbLocal.query<any>(`
            SELECT f.id_factura, f.folio_factura, f.fecha_emision, f.total_factura, f.estatus_factura,
                   c.razon_social_cliente_alm AS cliente,
                   ag.id_agente,
                   TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado)) AS agente,
                   (SELECT COUNT(*) FROM detalle_factura d WHERE d.id_factura = f.id_factura)::int AS n_detalles
            FROM facturas f
            LEFT JOIN cliente_almacen c ON c.id_cliente_alm = f.id_cliente_alm
            LEFT JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
            LEFT JOIN agente_de_venta ag ON ag.id_agente = COALESCE(p.id_agente_pedido_alm, c.id_agente_cliente_alm)
            LEFT JOIN empleado e ON e.id_empleado = ag.id_empleado
            WHERE f.tipo_cfdi = 'I'
              AND f.estatus_factura <> 'CAN'
              AND (f.folio_factura ILIKE :q OR c.razon_social_cliente_alm ILIKE :q)
              AND NOT EXISTS (
                    SELECT 1 FROM remision r
                    WHERE r.id_pedido_alm = f.id_pedido_alm AND r.id_factura IS NULL AND r.estatus_remision <> 'CAN')
            ORDER BY f.fecha_emision DESC
            LIMIT 25
        `, { replacements: { q: `%${busqueda}%` }, type: QueryTypes.SELECT });
    },

    // ── ADMIN: cabecera de la factura + agente a quien se le carga la devolución ──
    getCabeceraFacturaAdmin: async (id_factura: string) => {
        const filas = await dbLocal.query<any>(`
            SELECT f.id_factura, f.folio_factura, f.fecha_emision, f.total_factura, f.estatus_factura, f.id_pedido_alm,
                   c.razon_social_cliente_alm AS cliente,
                   ag.id_agente,
                   TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado)) AS agente
            FROM facturas f
            LEFT JOIN cliente_almacen c ON c.id_cliente_alm = f.id_cliente_alm
            LEFT JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
            LEFT JOIN agente_de_venta ag ON ag.id_agente = COALESCE(p.id_agente_pedido_alm, c.id_agente_cliente_alm)
            LEFT JOIN empleado e ON e.id_empleado = ag.id_empleado
            WHERE f.id_factura = :id AND f.tipo_cfdi = 'I'
        `, { replacements: { id: id_factura }, type: QueryTypes.SELECT });
        return filas[0] ?? null;
    },

    // ── Saldo pendiente de la CxC de la factura (null = no tiene CxC o ya está pagada) ──
    getSaldoCxcFactura: async (id_factura: string): Promise<number | null> => {
        let cxc = await Cuenta_Por_Cobrar.findOne({
            where: { id_factura },
            order: [['createdAt', 'DESC']],
        });
        if (!cxc) {
            const remision = await Remision.findOne({ where: { id_factura }, attributes: ['id_remision'] });
            if (remision) {
                cxc = await Cuenta_Por_Cobrar.findOne({
                    where: { id_remision: remision.id_remision },
                    order: [['createdAt', 'DESC']],
                });
            }
        }
        if (!cxc || cxc.estatus_cxc === 'PAG') return null;
        const saldo = Number(cxc.saldo_pendiente) || 0;
        return saldo > 0 ? Math.round(saldo * 100) / 100 : null;
    },

    // ── Total ya comprometido en devoluciones PENDIENTE/APROBADA de una factura ──
    getMontoYaDevuelto: async (id_factura: string): Promise<number> => {
        const filas = await dbLocal.query<{ total: string }>(`
            SELECT COALESCE(SUM(dd.subtotal_devolucion), 0) AS total
            FROM devolucion_cliente dc
            JOIN devolucion_cliente_detalle dd ON dd.id_devolucion_cliente = dc.id_devolucion_cliente
            WHERE dc.id_factura = :id AND dc.estatus IN ('PENDIENTE', 'APROBADA')
        `, { replacements: { id: id_factura }, type: QueryTypes.SELECT });
        return Number(filas[0]?.total ?? 0);
    },

    // ── Inventario virtual de agentes ──────────────────────────────────
    getInventarioVirtual: async (id_empresa: string, filtros: { id_agente?: string; estatus?: string }) => {
        return await dbLocal.query<any>(`
            SELECT v.id_inventario_virtual, v.id_agente, v.id_devolucion_cliente, v.id_articulo, v.id_lote,
                   v.descripcion_articulo, v.cantidad, v.folio_factura, v.estatus,
                   v."createdAt" AS fecha, v.fecha_recibido,
                   a.cod_int_artic, a.cod_barr_artic,
                   l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                   TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado)) AS agente
            FROM agente_inventario_virtual v
            LEFT JOIN articulo a ON a.id_artic = v.id_articulo
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = v.id_lote
            LEFT JOIN agente_de_venta ag ON ag.id_agente = v.id_agente
            LEFT JOIN empleado e ON e.id_empleado = ag.id_empleado
            WHERE v.id_empresa = :emp
              AND v.estatus = :estatus
              ${filtros.id_agente ? 'AND v.id_agente = :id_agente' : ''}
            ORDER BY agente ASC, v."createdAt" DESC
        `, {
            replacements: { emp: id_empresa, estatus: filtros.estatus || 'EN_AGENTE', id_agente: filtros.id_agente ?? null },
            type: QueryTypes.SELECT,
        });
    },

    // Asigna (o corrige) el lote y la caducidad de un renglón del inventario virtual que está en poder del agente.
    // El lote se reutiliza si ya existe para el artículo; si no, se crea. Así el renglón ya se puede recibir en almacén.
    asignarLoteInventarioVirtual: async (id_inventario_virtual: string, id_empresa: string, numero_lote: string, fecha_caducidad: string) => {
        const t = await dbLocal.transaction();
        try {
            const fila = await Agente_Inventario_Virtual.findOne({
                where: { id_inventario_virtual, id_empresa }, transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!fila) throw Object.assign(new Error('Renglón no encontrado.'), { status: 404 });
            if (fila.estatus !== 'EN_AGENTE') throw Object.assign(new Error('Ya fue recibido en almacén.'), { status: 400 });
            if (!fila.id_articulo) throw Object.assign(new Error('El renglón no tiene artículo del catálogo.'), { status: 400 });
            const lote = await obtenerOCrearLote(fila.id_articulo, id_empresa, numero_lote, fecha_caducidad, Number(fila.cantidad) || 0, t);
            await fila.update({ id_lote: lote.id_lote_sucursal }, { transaction: t });
            await t.commit();
            return { ok: true, id_lote: lote.id_lote_sucursal };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // Agrega a mano mercancía al inventario virtual de un agente (la tiene el agente y no vino de una devolución del sistema).
    // No tiene devolución ligada: se usa el identificador vacío y el folio "MANUAL". Después se recibe en almacén igual que las demás.
    agregarInventarioVirtualManual: async (d: {
        id_empresa: string; id_agente: string; id_articulo: string; cantidad: number; numero_lote?: string | null; fecha_caducidad?: string | null;
    }) => {
        const cantidad = Math.floor(Number(d.cantidad));
        if (!(cantidad > 0)) throw Object.assign(new Error('La cantidad debe ser mayor a 0.'), { status: 400 });
        const numero = String(d.numero_lote ?? '').trim();
        if (numero && !d.fecha_caducidad) throw Object.assign(new Error('Si capturas el lote, captura también su fecha de caducidad.'), { status: 400 });

        const [agente] = await dbLocal.query<any>(`SELECT id_agente FROM agente_de_venta WHERE id_agente = :id`,
            { replacements: { id: d.id_agente }, type: QueryTypes.SELECT });
        if (!agente) throw Object.assign(new Error('Agente no encontrado.'), { status: 404 });
        const [art] = await dbLocal.query<any>(`SELECT id_artic, des_artic FROM articulo WHERE id_artic = :id`,
            { replacements: { id: d.id_articulo }, type: QueryTypes.SELECT });
        if (!art) throw Object.assign(new Error('Artículo no encontrado.'), { status: 404 });

        const t = await dbLocal.transaction();
        try {
            let id_lote: string | null = null;
            if (numero) {
                const lote = await obtenerOCrearLote(d.id_articulo, d.id_empresa, numero, String(d.fecha_caducidad), cantidad, t);
                id_lote = lote.id_lote_sucursal;
            }
            const fila = await Agente_Inventario_Virtual.create({
                id_inventario_virtual: uuidv4(),
                id_empresa: d.id_empresa,
                id_agente: d.id_agente,
                id_devolucion_cliente: '00000000-0000-0000-0000-000000000000',
                id_articulo: d.id_articulo,
                id_lote,
                descripcion_articulo: String(art.des_artic ?? '').trim().slice(0, 255),
                cantidad,
                folio_factura: 'MANUAL',
                estatus: 'EN_AGENTE',
            } as any, { transaction: t });
            await t.commit();
            return { ok: true, id_inventario_virtual: fila.id_inventario_virtual };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // Lo que el agente tiene vigente en su inventario virtual, agrupado por artículo (con el detalle de cada devolución).
    getInventarioVirtualDeAgente: async (id_agente: string) => {
        const filas = await dbLocal.query<any>(`
            SELECT v.id_articulo, v.cantidad, v.folio_factura, v."createdAt" AS fecha,
                   l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
            FROM agente_inventario_virtual v
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = v.id_lote
            WHERE v.id_agente = :ag AND v.estatus = 'EN_AGENTE' AND v.id_articulo IS NOT NULL AND v.cantidad > 0
            ORDER BY v."createdAt" ASC
        `, { replacements: { ag: id_agente }, type: QueryTypes.SELECT });

        const porArticulo: Record<string, {
            cantidad: number;
            detalle: { cantidad: number; folio_factura: string | null; fecha: string; numero_lote: string | null; fecha_vencimiento: string | null }[];
        }> = {};
        for (const f of filas) {
            const k = String(f.id_articulo);
            const g = porArticulo[k] ?? (porArticulo[k] = { cantidad: 0, detalle: [] });
            g.cantidad += Number(f.cantidad) || 0;
            g.detalle.push({
                cantidad: Number(f.cantidad) || 0,
                folio_factura: f.folio_factura ?? null,
                fecha: f.fecha,
                numero_lote: f.numero_lote_sucursal ? String(f.numero_lote_sucursal).trim() : null,
                fecha_vencimiento: f.fecha_venci_lote_sucursal ?? null,
            });
        }
        return porArticulo;
    },

    // Pasa mercancía del inventario del agente al almacén: stock SIN UBICACIÓN + Kardex ENTRADA.
    // Cada renglón va en su propia transacción: si uno falla, los demás sí se reciben.
    recibirInventarioVirtual: async (ids: string[], id_empresa: string, id_empleado: string) => {
        const recibidos: { id: string; descripcion: string; cantidad: number }[] = [];
        const errores: { id: string; descripcion: string; mensaje: string }[] = [];

        for (const id of ids) {
            const t = await dbLocal.transaction();
            let descripcion = id;
            try {
                const fila = await Agente_Inventario_Virtual.findOne({
                    where: { id_inventario_virtual: id, id_empresa },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!fila) throw new Error('Renglón no encontrado.');
                descripcion = fila.descripcion_articulo;
                if (fila.estatus !== 'EN_AGENTE') throw new Error('Ya fue recibido en almacén.');
                if (!fila.id_articulo || !fila.id_lote) {
                    throw new Error('No tiene lote asociado; no se puede dar entrada al stock sin lote.');
                }

                const cantidad = Number(fila.cantidad);
                const [stockRow] = await Stock_Ubicacion_Lote.findOrCreate({
                    where: {
                        id_lote: fila.id_lote,
                        id_articulo: fila.id_articulo,
                        id_empresa_sucursal: id_empresa,
                        id_ubicacion_sucursal: null,
                    },
                    defaults: {
                        id_stock_ubicacion_lote: uuidv4(),
                        id_lote: fila.id_lote,
                        id_articulo: fila.id_articulo,
                        id_empresa_sucursal: id_empresa,
                        id_ubicacion_sucursal: null,
                        cantidad: 0,
                        cantidad_apartada: 0,
                    },
                    transaction: t,
                });
                await stockRow.update({ cantidad: Number(stockRow.cantidad) + cantidad }, { transaction: t });

                await Kardex_Movimientos_Articulos.create({
                    id_kardex_movimientos: uuidv4(),
                    id_empresa,
                    fecha: new Date(),
                    id_articulo: fila.id_articulo,
                    id_lote: fila.id_lote,
                    tipo_movimiento: 'ENTRADA',
                    categoria: 'Entrada_Salida',
                    id_origen_ubicacion: null,
                    id_destino_ubicacion: null,
                    cantidad_movimiento: cantidad,
                    documento_ref: fila.id_devolucion_cliente,
                    id_pedido: null,
                    id_empleado,
                    // Mismo formato que la devolución recibida directo: el tablero de acomodo lo reconoce como "Devolución"
                    notas: `Devolución recibida · Sin ubicar · Factura ${fila.folio_factura ?? ''}`.trim(),
                }, { transaction: t });

                await fila.update(
                    { estatus: 'RECIBIDO', fecha_recibido: new Date(), id_empleado_recibe: id_empleado },
                    { transaction: t },
                );

                await t.commit();
                recibidos.push({ id, descripcion, cantidad });
            } catch (err: any) {
                await t.rollback();
                errores.push({ id, descripcion, mensaje: err?.message ?? 'Error desconocido' });
            }
        }
        return { recibidos, errores };
    },

    // ── Facturas de una venta de Público General: la factura nace al cobrar cada abono, a partir de la REMISIÓN ──
    //    Esas facturas son la misma venta que la remisión (sin CFDI): se devuelven por la remisión, con nota de crédito interna.
    //    Devuelve la remisión sin CFDI de la que nació la factura, o null si es una factura normal.
    remisionSinCfdiDeFactura: async (id_factura: string): Promise<{ id_remision: string; folio_remision: number } | null> => {
        const filas = await dbLocal.query<any>(`
            SELECT r.id_remision, r.folio_remision
            FROM facturas f
            JOIN remision r ON r.id_pedido_alm = f.id_pedido_alm AND r.id_factura IS NULL AND r.estatus_remision <> 'CAN'
            WHERE f.id_factura = :id
            ORDER BY r.folio_remision
            LIMIT 1
        `, { replacements: { id: id_factura }, type: QueryTypes.SELECT });
        return filas[0] ?? null;
    },

    // ── Buscar facturas del agente por folio (para el buscador) ──
    //    Facturas de sus pedidos Y de los clientes que tiene asignados hoy: si le pasaron un cliente (reasignación de cartera),
    //    puede hacerle devoluciones de facturas anteriores aunque esos pedidos los haya vendido el agente anterior.
    //    NO incluye las facturas que nacieron de una remisión sin CFDI (Público General): esas se devuelven por la remisión.
    buscarFacturasAgente: async (id_agente: string, busqueda: string) => {
        if (!/^[0-9a-f-]{36}$/i.test(id_agente)) return [];
        return await dbLocal.query<any>(`
            SELECT f.id_factura, f.folio_factura, f.fecha_emision, f.total_factura
            FROM facturas f
            LEFT JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
            WHERE f.tipo_cfdi = 'I'
              AND f.estatus_factura <> 'CAN'
              AND f.folio_factura ILIKE :q
              AND (p.id_agente_pedido_alm = :ag
                   OR f.id_cliente_alm IN (SELECT c.id_cliente_alm FROM cliente_almacen c WHERE c.id_agente_cliente_alm = :ag))
              AND NOT EXISTS (
                    SELECT 1 FROM remision r
                    WHERE r.id_pedido_alm = f.id_pedido_alm AND r.id_factura IS NULL AND r.estatus_remision <> 'CAN')
            ORDER BY f.fecha_emision DESC
            LIMIT 20
        `, { replacements: { q: `%${busqueda}%`, ag: id_agente }, type: QueryTypes.SELECT });
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

// Lote con el que salió cada artículo en el pedido original (el de mayor cantidad).
async function lotesOriginalesDelPedido(id_pedido_alm: string, idsArticulos: string[], t: Transaction) {
    const mapa = new Map<string, string>();
    if (!idsArticulos.length) return mapa;
    const filas = await dbLocal.query<{ id_articulo: string; id_lote_sucursal: string }>(`
        SELECT dpa.id_articulo, dpal.id_lote_sucursal
        FROM detalle_pedido_almacen      dpa
        JOIN detalle_pedido_almacen_lote dpal
            ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
        WHERE dpa.id_pedido_almacen = :id_pedido_alm
          AND dpa.id_articulo IN (:ids)
        GROUP BY dpa.id_articulo, dpal.id_lote_sucursal
        ORDER BY SUM(dpal.cantidad) DESC
    `, {
        replacements: { id_pedido_alm, ids: idsArticulos },
        type: QueryTypes.SELECT,
        transaction: t,
    });
    for (const f of filas) if (!mapa.has(f.id_articulo)) mapa.set(f.id_articulo, f.id_lote_sucursal);
    return mapa;
}

// Forma de pago para registrar el descuento de una devolución de remisión: debe existir en el catálogo (el pago la
// referencia con llave foránea). Se usa la del último pago de esa cuenta; si no hay, "99" (por definir), "17" o "01"; y
// si el catálogo no tiene ninguna de esas, la primera que haya.
async function formaDePagoValida(id_cxc: string, t: Transaction): Promise<string> {
    const [ultimo] = await dbLocal.query<any>(`
        SELECT p.id_forma_pago AS id
        FROM pago_cxc p
        JOIN cat_forma_de_pago f ON f.id_forma_de_pago = p.id_forma_pago
        WHERE p.id_cxc = :id AND p.estatus_pago <> 'DEV'
        ORDER BY p."createdAt" DESC
        LIMIT 1
    `, { replacements: { id: id_cxc }, type: QueryTypes.SELECT, transaction: t });
    if (ultimo?.id) return String(ultimo.id);

    const [preferida] = await dbLocal.query<any>(`
        SELECT id_forma_de_pago AS id FROM cat_forma_de_pago
        WHERE id_forma_de_pago IN ('99', '17', '01')
        ORDER BY CASE id_forma_de_pago WHEN '99' THEN 1 WHEN '17' THEN 2 ELSE 3 END
        LIMIT 1
    `, { type: QueryTypes.SELECT, transaction: t });
    if (preferida?.id) return String(preferida.id);

    const [cualquiera] = await dbLocal.query<any>(
        `SELECT id_forma_de_pago AS id FROM cat_forma_de_pago ORDER BY id_forma_de_pago LIMIT 1`,
        { type: QueryTypes.SELECT, transaction: t });
    if (!cualquiera?.id) throw Object.assign(new Error('El catálogo de formas de pago está vacío.'), { status: 500 });
    return String(cualquiera.id);
}

// ── Aprobar la devolución de una REMISIÓN sin CFDI ──────────────────────────────────────────────────────────
// Una remisión no tiene factura: la factura de cada abono se genera al cobrarlo. Por eso aquí NO se timbra nada
// (no hay CFDI de egreso); se hace una nota de crédito INTERNA:
//   · baja el saldo de la cuenta por cobrar de la remisión (hasta lo que el cliente todavía debe);
//   · lo que exceda el saldo queda como nota de crédito a favor del cliente (saldo a favor, sin timbrar);
//   · la remisión refleja la devolución en sus totales, y los abonos que falten se facturan sin lo devuelto;
//   · la mercancía regresa al almacén (sin ubicar) o queda en el inventario virtual del agente, igual que con facturas.
async function aprobarDevolucionRemision(
    dev: Devolucion_Cliente,
    id_empleado_aprueba: string,
    recibio_mercancia: boolean,
    id_empresa?: string,
) {
    const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    const remision = await Remision.findByPk(dev.id_remision!);
    if (!remision) throw Object.assign(new Error('La remisión de esta devolución ya no existe.'), { status: 404 });
    if (remision.estatus_remision === 'CAN') {
        throw Object.assign(new Error('La remisión está cancelada: no se puede aprobar la devolución.'), { status: 400 });
    }
    const folioRem = `REM-${remision.folio_remision}`;

    // Importe CON IVA: cada renglón con la tasa de la remisión, redondeado por renglón (como la factura)
    const tasasRem = await Detalle_Remision.findAll({
        where: { id_remision: dev.id_remision! }, attributes: ['id_articulo', 'tasa_iva'], raw: true,
    }) as any[];
    const tasaPorArticulo = new Map<string, number>(tasasRem.map(t => [String(t.id_articulo), Number(t.tasa_iva ?? 0)]));
    let subtotal = 0;
    let iva = 0;
    for (const d of dev.detalles) {
        const sub = r2(Number(d.subtotal_devolucion));
        subtotal += sub;
        iva += r2(sub * (d.id_articulo ? (tasaPorArticulo.get(String(d.id_articulo)) ?? 0) : 0));
    }
    subtotal = r2(subtotal);
    iva = r2(iva);
    const monto_con_iva = r2(subtotal + iva);
    if (monto_con_iva <= 0) throw Object.assign(new Error('El monto de la devolución debe ser mayor a 0.'), { status: 400 });

    const cxc = await Cuenta_Por_Cobrar.findOne({
        where: { id_remision: dev.id_remision! },
        order: [['createdAt', 'DESC']],
    });

    const t = await dbLocal.transaction();
    try {
        let resultado_aprobacion: string;
        let id_cxc_afectada: string | null = null;
        let queda_liquidada = false;

        if (cxc && cxc.estatus_cxc !== 'PAG') {
            // Se descuenta lo que el cliente todavía debe; lo que sobre queda como saldo a favor
            const saldo_actual = Math.max(0, Number(cxc.saldo_pendiente));
            const monto_aplicado = r2(Math.min(saldo_actual, monto_con_iva));
            const sobrante = r2(monto_con_iva - monto_aplicado);
            const nuevo_saldo = Math.max(0, r2(saldo_actual - monto_aplicado));
            const nuevo_total = Math.max(0, r2(Number(cxc.monto_total) - monto_aplicado));
            const nuevo_estatus = nuevo_saldo <= 0 ? 'PAG' : Number(cxc.monto_pagado) > 0 ? 'PAR' : 'PEN';

            // Pagos que el agente ya capturó pero el encargado aún no aplica ("en revisión"): si después de la devolución el
            // saldo ya no alcanza para cubrirlos, no se podrían aplicar. Se pide resolverlos antes.
            const enRevision = ((await Pago_CxC.sum('monto_pago', {
                where: { id_cxc: cxc.id_cxc, estatus_pago: 'CAP' }, transaction: t,
            })) as number) || 0;
            if (enRevision > 0.009 && nuevo_saldo + 0.009 < enRevision) {
                throw Object.assign(new Error(
                    `El cliente tiene $${enRevision.toFixed(2)} en pagos por aplicar (en revisión) sobre ${folioRem}, y con esta devolución ` +
                    `el saldo quedaría en $${nuevo_saldo.toFixed(2)}. Aplica o cancela ese pago antes de aprobar la devolución.`
                ), { status: 409 });
            }

            await cxc.update({ monto_total: nuevo_total, saldo_pendiente: nuevo_saldo, estatus_cxc: nuevo_estatus }, { transaction: t });

            if (monto_aplicado > 0) {
                const id_forma_pago = await formaDePagoValida(cxc.id_cxc, t);
                await Pago_CxC.create({
                    id_pago_cxc: uuidv4(),
                    id_cxc: cxc.id_cxc,
                    id_metodo_pago: 'PUE',
                    id_forma_pago,
                    monto_pago: monto_aplicado,
                    fecha_pago: new Date(),
                    numero_recibo: `DEV-${dev.id_devolucion_cliente.slice(0, 8)}`,
                    referencia_pago: `DEV-${folioRem}`,
                    id_empleado_captura: id_empleado_aprueba,
                    id_empleado_aplica: id_empleado_aprueba,
                    fecha_aplicado: new Date(),
                    notas: `Nota de crédito interna (sin timbrar) — devolución aprobada sobre ${folioRem}.`,
                    estatus_pago: 'DEV',
                }, { transaction: t });
            }

            if (sobrante > 0.009) {
                await Nota_Credito_Cliente.create({
                    id_nota_credito: uuidv4(),
                    id_cliente_alm: remision.id_cliente_alm,
                    id_devolucion_cliente: dev.id_devolucion_cliente,
                    monto_original: sobrante,
                    saldo_disponible: sobrante,
                    estatus: 'DISPONIBLE',
                    concepto: `Saldo a favor de devolución · ${folioRem} (excedió el saldo pendiente)`,
                    uuid_cfdi_egreso: null,
                }, { transaction: t });
            }

            resultado_aprobacion = 'DESCUENTO_CXC';
            id_cxc_afectada = cxc.id_cxc;
            queda_liquidada = nuevo_estatus === 'PAG';
        } else {
            // Ya estaba pagada (o no tiene cuenta por cobrar): todo queda como saldo a favor del cliente
            await Nota_Credito_Cliente.create({
                id_nota_credito: uuidv4(),
                id_cliente_alm: remision.id_cliente_alm,
                id_devolucion_cliente: dev.id_devolucion_cliente,
                monto_original: monto_con_iva,
                saldo_disponible: monto_con_iva,
                estatus: 'DISPONIBLE',
                concepto: `Devolución aprobada · ${folioRem}`,
                uuid_cfdi_egreso: null,
            }, { transaction: t });
            resultado_aprobacion = 'NOTA_CREDITO';
        }

        // La remisión refleja lo devuelto (la venta neta baja) y deja constancia en sus notas
        const nota = `Devolución DEV-${dev.id_devolucion_cliente.slice(0, 8)}: -$${monto_con_iva.toFixed(2)}`;
        await remision.update({
            subtotal_remision: Math.max(0, r2(Number(remision.subtotal_remision) - subtotal)),
            iva_remision: Math.max(0, r2(Number(remision.iva_remision) - iva)),
            total_remision: Math.max(0, r2(Number(remision.total_remision) - monto_con_iva)),
            notas: [remision.notas, nota].filter(Boolean).join(' | '),
            ...(queda_liquidada ? { estatus_remision: 'LIQ' } : {}),
        }, { transaction: t });

        // Mercancía: recibida → stock sin ubicar (+ Kardex) · no recibida → inventario virtual del agente
        let inventario_virtual = false;
        if (recibio_mercancia && remision.id_pedido_alm) {
            await registrarEntradaMercancia({
                detalles: dev.detalles,
                id_pedido_alm: remision.id_pedido_alm,
                id_devolucion_cliente: dev.id_devolucion_cliente,
                id_empleado_aprueba,
                folio_factura: folioRem,
                id_empresa: id_empresa ?? '',
                t,
            });
        } else if (!recibio_mercancia) {
            inventario_virtual = (await registrarInventarioVirtual({
                detalles: dev.detalles,
                id_pedido_alm: remision.id_pedido_alm,
                id_devolucion_cliente: dev.id_devolucion_cliente,
                id_agente: dev.id_agente,
                folio_factura: folioRem,
                id_empresa: id_empresa ?? '',
                t,
            })) > 0;
        }

        await dev.update({
            estatus: 'APROBADA',
            resultado_aprobacion,
            id_cxc_afectada,
            uuid_cfdi_egreso: null,
            id_factura_egreso: null,
            recibio_mercancia,
            fecha_recepcion_mercancia: recibio_mercancia ? new Date() : null,
        }, { transaction: t });

        await t.commit();
        return {
            dev, resultado_aprobacion, monto_devolucion: monto_con_iva,
            egreso: null as { folio: number | string; ruta_txt?: string } | null,
            recibio_mercancia, es_factura_vieja: false, es_remision: true, inventario_virtual, entradas_manuales: 0,
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

// Mercancía devuelta que NO llegó al almacén: queda en el inventario virtual del agente.
// Devuelve cuántos renglones se registraron.
async function registrarInventarioVirtual(params: {
    detalles: import('../model/Devolucion_Cliente_Detalle.model').default[];
    id_pedido_alm: string | null;
    id_devolucion_cliente: string;
    id_agente: string;
    folio_factura: string;
    id_empresa: string;
    t: Transaction;
}): Promise<number> {
    const { detalles, id_pedido_alm, id_devolucion_cliente, id_agente, folio_factura, id_empresa, t } = params;
    const conArticulo = detalles.filter(d => d.id_articulo && Number(d.cantidad_devolucion) > 0);
    if (!conArticulo.length) return 0;

    const loteMap = id_pedido_alm
        ? await lotesOriginalesDelPedido(id_pedido_alm, conArticulo.map(d => d.id_articulo!), t)
        : new Map<string, string>();

    await Agente_Inventario_Virtual.bulkCreate(conArticulo.map(d => ({
        id_inventario_virtual: uuidv4(),
        id_empresa,
        id_agente,
        id_devolucion_cliente,
        id_articulo: d.id_articulo!,
        id_lote: loteMap.get(d.id_articulo!) ?? null,
        descripcion_articulo: d.descripcion_articulo,
        cantidad: Number(d.cantidad_devolucion),
        folio_factura,
        estatus: 'EN_AGENTE',
    })), { transaction: t });

    return conArticulo.length;
}

// Lote del artículo con ese número (se reutiliza tal cual) o uno nuevo con la caducidad capturada.
// Costo del lote nuevo: el del último lote del artículo (la factura anterior no trae costo).
async function obtenerOCrearLote(id_articulo: string, id_empresa: string, numero: string, caducidad: string, cantidad: number, t: Transaction) {
    const existente = await Lote_Articulo_Sucursal.findOne({
        where: { id_artic: id_articulo, id_empre: id_empresa, numero_lote_sucursal: numero },
        transaction: t,
    });
    if (existente) return existente;
    const ultimo = await Lote_Articulo_Sucursal.findOne({
        where: { id_artic: id_articulo, id_empre: id_empresa },
        order: [['createdAt', 'DESC']],
        transaction: t,
    });
    return await Lote_Articulo_Sucursal.create({
        id_lote_sucursal: uuidv4(),
        id_artic: id_articulo,
        id_empre: id_empresa,
        numero_lote_sucursal: numero,
        fecha_venci_lote_sucursal: new Date(`${caducidad}T12:00:00`),
        cantidad_entrada_lote: cantidad,
        precio_costo_lote_sucursal: Number(ultimo?.precio_costo_lote_sucursal ?? 0),
        estado_lote_sucursal: 'A',
    } as any, { transaction: t });
}

// Factura anterior: la mercancía regresó y se capturó su lote y caducidad. Entra al almacén SIN UBICACIÓN
// (stock + Kardex ENTRADA). Si el lote ya existe para el artículo se reutiliza tal cual; si no, se crea.
async function registrarEntradaManual(params: {
    entradas: IEntradaManualDevolucion[];
    id_devolucion_cliente: string;
    id_empleado_aprueba: string;
    folio_factura: string;
    id_empresa: string;
    t: Transaction;
}): Promise<number> {
    const { entradas, id_devolucion_cliente, id_empleado_aprueba, folio_factura, id_empresa, t } = params;
    let n = 0;

    for (const e of entradas) {
        const cantidad = Number(e.cantidad);
        if (!e.id_articulo || !(cantidad > 0)) continue;
        const numero = String(e.numero_lote).trim();

        const lote = await obtenerOCrearLote(e.id_articulo, id_empresa, numero, String(e.fecha_caducidad ?? '').slice(0, 10), cantidad, t);

        const [stockRow] = await Stock_Ubicacion_Lote.findOrCreate({
            where: {
                id_lote: lote.id_lote_sucursal,
                id_articulo: e.id_articulo,
                id_empresa_sucursal: id_empresa,
                id_ubicacion_sucursal: null,
            },
            defaults: {
                id_stock_ubicacion_lote: uuidv4(),
                id_lote: lote.id_lote_sucursal,
                id_articulo: e.id_articulo,
                id_empresa_sucursal: id_empresa,
                id_ubicacion_sucursal: null,
                cantidad: 0,
                cantidad_apartada: 0,
            },
            transaction: t,
        });
        await stockRow.update({ cantidad: Number(stockRow.cantidad) + cantidad }, { transaction: t });

        await Kardex_Movimientos_Articulos.create({
            id_kardex_movimientos: uuidv4(),
            id_empresa,
            fecha: new Date(),
            id_articulo: e.id_articulo,
            id_lote: lote.id_lote_sucursal,
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
        n++;
    }
    return n;
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
    id_empresa: string;
    t: Transaction;
}) {
    const { detalles, id_pedido_alm, id_devolucion_cliente, id_empleado_aprueba, folio_factura, id_empresa, t } = params;

    // Artículos con id_articulo (los genéricos sin id se omiten)
    const detallesConArticulo = detalles.filter(d => d.id_articulo);
    if (!detallesConArticulo.length) return;

    // Mapa: id_articulo → id_lote_sucursal (el lote que más salió en el pedido original)
    const loteMap = await lotesOriginalesDelPedido(
        id_pedido_alm,
        detallesConArticulo.map(d => d.id_articulo!),
        t,
    );

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
