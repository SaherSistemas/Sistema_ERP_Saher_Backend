import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { resumir, MAX_SEG_PROCESO, type ProcesoResumen } from './ProductividadAlmacen.service';

// Entre un acomodo y el siguiente del mismo empleado (el mismo día) pasan más de esto = ya fue una pausa
const PAUSA_ACOMODO_SEG = 10 * 60;

// Área de compras en el tablero del almacén: cuánto tardan en cada etapa (por empleado), cuánto se hizo
// en el periodo y qué está pendiente ahora.
//
// Etapas del flujo (compra_proveedor / factura_compra_proveedor):
//   captura de la compra → enviada al proveedor → llega y se registra la factura con sus lotes →
//   se checa la mercancía → se acomoda.
// Estados de la factura del proveedor: E capturando lotes · C lotes capturados · R checando · H checada ·
// D con devolución · A acomodada · F finalizada.
//
// Todas las fechas se comparan por día LOCAL (Culiacán), igual que los tiempos de surtido/chequeo/empaque.

const TZ = `'America/Mazatlan'`;
const num = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Una consulta secundaria que falle no debe tumbar todo el panel
async function seguro<T>(nombre: string, p: Promise<T>, vacio: T): Promise<T> {
    try { return await p; } catch (e: any) {
        console.error(`[ProductividadCompras] ${nombre}:`, e?.message ?? e);
        return vacio;
    }
}

const consulta = (sql: string, rep: Record<string, unknown>): Promise<any[]> =>
    dbLocal.query(sql, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>;

// Acomodo por ARTÍCULO. El acomodo no tiene "inicio" ni "fin" por factura: cada artículo se acomoda suelto, así que
// el tiempo de uno es lo que pasó desde el acomodo anterior del mismo empleado (si fue de corrido, menos de 10 min).
// Solo cuenta la mercancía que vino de compras (o de origen desconocido), no devoluciones ni cancelaciones.
async function resumirAcomodo(desde: string, hasta: string): Promise<ProcesoResumen> {
    const filas = await consulta(`
        WITH a AS (
            SELECT k.id_empleado, k.fecha, k.cantidad_movimiento,
                   k.fecha - LAG(k.fecha) OVER (
                       PARTITION BY k.id_empleado, (k.fecha AT TIME ZONE ${TZ})::date ORDER BY k.fecha
                   ) AS desde_anterior
            FROM kardex_movimientos_articulos k
            WHERE k.tipo_movimiento = 'TRASLADO' AND k.id_origen_ubicacion IS NULL
              AND k.notas LIKE 'Acomodo · %'
              AND k.notas NOT LIKE 'Acomodo · devolución%' AND k.notas NOT LIKE 'Acomodo · cancelación%'
              AND (k.fecha AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
        )
        SELECT a.id_empleado,
               TRIM(CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado)) AS nombre,
               COUNT(*)                                  AS articulos,
               COALESCE(SUM(a.cantidad_movimiento), 0)   AS piezas,
               COALESCE(SUM(EXTRACT(EPOCH FROM a.desde_anterior)) FILTER (WHERE a.desde_anterior BETWEEN INTERVAL '1 second' AND INTERVAL '${PAUSA_ACOMODO_SEG} seconds'), 0) AS seg_total,
               COUNT(*) FILTER (WHERE a.desde_anterior BETWEEN INTERVAL '1 second' AND INTERVAL '${PAUSA_ACOMODO_SEG} seconds') AS medidos,
               COALESCE(SUM(a.cantidad_movimiento) FILTER (WHERE a.desde_anterior BETWEEN INTERVAL '1 second' AND INTERVAL '${PAUSA_ACOMODO_SEG} seconds'), 0) AS piezas_medidas,
               COUNT(*) FILTER (WHERE a.desde_anterior > INTERVAL '${PAUSA_ACOMODO_SEG} seconds') AS pausas
        FROM a
        LEFT JOIN empleado e ON e.id_empleado = a.id_empleado
        GROUP BY a.id_empleado, e.nombre_empleado, e.ap_pat_empleado
        ORDER BY COUNT(*) DESC
    `, { desde, hasta });

    let articulos = 0, segTotal = 0, medidos = 0, pausas = 0;
    const empleados = filas.map(r => {
        const art = num(r.articulos);
        const seg = num(r.seg_total);
        const med = num(r.medidos);
        const pzMed = num(r.piezas_medidas);
        articulos += art; segTotal += seg; medidos += med; pausas += num(r.pausas);
        return {
            id_empleado: r.id_empleado,
            nombre: String(r.nombre ?? '').trim() || 'Sin nombre',
            pedidos: art,
            volumen: num(r.piezas),
            promedio_seg: med > 0 ? Math.round(seg / med) : 0,
            seg_por_unidad: pzMed > 0 ? Math.round(seg / pzMed) : null,
        };
    });
    return {
        pedidos: articulos,
        promedio_seg: medidos > 0 ? Math.round(segTotal / medidos) : 0,
        descartados: pausas,
        unidad: 'pieza',
        empleados,
    };
}

export interface ComprasResumen {
    desde: string;
    hasta: string;
    limite_horas: number;
    procesos: {
        captura: ProcesoResumen;
        registro_lotes: ProcesoResumen;
        checado: ProcesoResumen;
        acomodo: ProcesoResumen;
    };
    periodo: {
        ordenes: number;
        proveedores: number;
        monto_ordenado: number;
        piezas_ordenadas: number;
        ordenes_enviadas: number;
        facturas: number;
        monto_facturado: number;
        facturas_checadas: number;
        monto_checado: number;       // facturado, de las facturas ya checadas
        monto_recibido: number;      // lo que realmente llegó, de esas mismas
        surtido_pct: number | null;  // recibido / facturado
        facturas_con_devolucion: number;
        lotes: number;
        piezas_lotes: number;
        notas_credito: number;
        monto_notas_credito: number;
        ciclo_prom_seg: number;      // factura registrada → acomodada
        ciclo_mediana_seg: number;
        ciclo_n: number;
    };
    por_dia: { fecha: string; facturas: number; monto: number }[];
    proveedores: {
        id_proveedor: string;
        proveedor: string;
        facturas: number;
        monto: number;
        surtido_pct: number | null;
        dias_entrega: number | null;  // orden enviada al proveedor → mercancía ya checada
    }[];
    pendiente: {
        ordenes_esperando: number;
        monto_esperando: number;
        orden_mas_antigua: string | null;
        por_registrar_lotes: number;
        registrar_mas_antigua: string | null;
        por_checar: number;
        checar_mas_antigua: string | null;
        por_acomodar: number;
        piezas_por_acomodar: number;
        acomodar_mas_antigua: string | null;
    };
    generado: string;
}

const FACTURA_COMPRA = `f.tipo_origen = 'COMPRA'`;
const REGISTRADA_EN_RANGO = `(f.inicio_de_registro_lotes AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta`;

export type TipoPendienteCompras = 'ordenes' | 'registrar' | 'checar' | 'acomodar';
export const TIPOS_PENDIENTE_COMPRAS: TipoPendienteCompras[] = ['ordenes', 'registrar', 'checar', 'acomodar'];

const TOPE_PENDIENTES = 300;

export const ProductividadComprasService = {

    // Detalle de lo que cuentan las tarjetas de "Pendiente ahora" (más antiguo primero)
    getPendientes: async (tipo: TipoPendienteCompras) => {
        let filas: any[] = [];

        if (tipo === 'ordenes') {
            filas = await consulta(`
                SELECT cp.id_comp AS id, cg.id_interno_compra_gen AS folio, p.nomcort_prove AS proveedor,
                       cp.fecha_enviada_proveedor AS desde,
                       COALESCE((SELECT SUM(d.cantidad_detcompsol * d.precio_detcompsol) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp), 0) AS monto,
                       COALESCE((SELECT SUM(d.cantidad_detcompsol) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp), 0) AS piezas,
                       COUNT(*) OVER () AS total
                FROM compra_proveedor cp
                LEFT JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
                LEFT JOIN proveedor p ON p.id_prove = cp.idprove_comp
                WHERE cp.estado_comp = 'E'
                ORDER BY cp.fecha_enviada_proveedor ASC NULLS LAST
                LIMIT ${TOPE_PENDIENTES}
            `, {});
        } else if (tipo === 'registrar' || tipo === 'checar') {
            const estados = tipo === 'registrar' ? `('E')` : `('C', 'R')`;
            const desde = tipo === 'registrar'
                ? 'f.inicio_de_registro_lotes'
                : 'COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes)';
            filas = await consulta(`
                SELECT f.id_factura_proveedor AS id, f.folio_factura_proveedor AS folio, p.nomcort_prove AS proveedor,
                       f.total_factura_proveedor AS monto, f.fecha_emision::text AS fecha_emision,
                       ${desde} AS desde, f.estado_factura_proveedor AS estado,
                       (SELECT COUNT(*) FROM detalle_factura_compra_proveedor d WHERE d.id_factura_compra_proveedor = f.id_factura_proveedor) AS renglones,
                       TRIM(CONCAT(er.nombre_empleado, ' ', er.ap_pat_empleado)) AS registro,
                       TRIM(CONCAT(ec.nombre_empleado, ' ', ec.ap_pat_empleado)) AS checando,
                       COUNT(*) OVER () AS total
                FROM factura_compra_proveedor f
                LEFT JOIN compra_proveedor cp ON cp.id_comp = f.id_compra_prove_factura
                LEFT JOIN proveedor p ON p.id_prove = cp.idprove_comp
                LEFT JOIN empleado er ON er.id_empleado = f.id_empleado_registro_lotes
                LEFT JOIN empleado ec ON ec.id_empleado = f.id_empleado_checado
                WHERE ${FACTURA_COMPRA} AND f.estado_factura_proveedor IN ${estados}
                  AND f.inicio_de_registro_lotes >= NOW() - INTERVAL '60 days'
                ORDER BY ${desde} ASC NULLS LAST
                LIMIT ${TOPE_PENDIENTES}
            `, {});
        } else {
            filas = await consulta(`
                SELECT s.id_stock_ubicacion_lote AS id, a.des_artic AS articulo, a.cod_int_artic AS codigo,
                       l.numero_lote_sucursal AS lote, l.fecha_venci_lote_sucursal::date::text AS caducidad,
                       s.cantidad AS piezas, s."createdAt" AS desde, COUNT(*) OVER () AS total
                FROM stock_ubicacion_lote s
                JOIN articulo a ON a.id_artic = s.id_articulo
                LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                WHERE s.id_ubicacion_sucursal IS NULL AND s.cantidad > 0
                ORDER BY s."createdAt" ASC
                LIMIT ${TOPE_PENDIENTES}
            `, {});
        }

        const iso = (v: unknown) => (v ? new Date(v as any).toISOString() : null);
        return {
            tipo,
            total: filas.length ? num(filas[0].total) : 0,
            tope: TOPE_PENDIENTES,
            filas: filas.map(r => ({
                id: r.id,
                folio: r.folio ?? null,
                proveedor: r.proveedor ?? null,
                monto: r.monto === undefined ? null : r2(num(r.monto)),
                piezas: r.piezas === undefined ? null : num(r.piezas),
                renglones: r.renglones === undefined ? null : num(r.renglones),
                fecha_emision: r.fecha_emision ?? null,
                desde: iso(r.desde),
                estado: r.estado ?? null,
                registro: (r.registro ?? '').trim() || null,
                checando: (r.checando ?? '').trim() || null,
                articulo: r.articulo ?? null,
                codigo: r.codigo ?? null,
                lote: r.lote ?? null,
                caducidad: r.caducidad ?? null,
            })),
        };
    },

    getResumen: async (desde: string, hasta: string): Promise<ComprasResumen> => {
        const rep = { desde, hasta };
        const vacioProceso = (unidad: ProcesoResumen['unidad']): ProcesoResumen =>
            ({ pedidos: 0, promedio_seg: 0, descartados: 0, unidad, empleados: [] });

        const [
            captura, registroLotes, checado, acomodo,
            ordenes, facturas, lotes, notas, ciclo, porDia, proveedores, pendFact, pendAcomodo, pendOrd,
        ] = await Promise.all([
            // CAPTURA DE LA COMPRA — de que se abre la compra a que se finaliza la captura (quien la finaliza)
            seguro('captura', resumir(`
                SELECT cg.id_compra_general AS id_pedido, cp.id_empleado_compra AS id_empleado,
                       cg.fecha_inicio AS ini, cg.fecha_fin_captura AS fin,
                       COUNT(DISTINCT d.id_detcompsol) AS volumen
                FROM compra_general cg
                JOIN compra_proveedor cp ON cp.id_compra_general = cg.id_compra_general
                LEFT JOIN detalle_compra_solicitado d ON d.idcompr_detcompsol = cp.id_comp
                WHERE cg.fecha_fin_captura IS NOT NULL AND cp.id_empleado_compra IS NOT NULL
                  AND (cg.fecha_fin_captura AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
                GROUP BY cg.id_compra_general, cp.id_empleado_compra, cg.fecha_inicio, cg.fecha_fin_captura
            `, desde, hasta, 'artículo'), vacioProceso('artículo')),

            // REGISTRO DE LOTES — de que se captura la factura a que se guardan sus lotes
            seguro('registro_lotes', resumir(`
                SELECT f.id_factura_proveedor AS id_pedido, f.id_empleado_registro_lotes AS id_empleado,
                       f.inicio_de_registro_lotes AS ini, f.fin_de_registro_lotes AS fin,
                       COUNT(DISTINCT d.id_factura_proveedor_detalle) AS volumen
                FROM factura_compra_proveedor f
                LEFT JOIN detalle_factura_compra_proveedor d ON d.id_factura_compra_proveedor = f.id_factura_proveedor
                WHERE ${FACTURA_COMPRA} AND f.fin_de_registro_lotes IS NOT NULL AND f.id_empleado_registro_lotes IS NOT NULL
                  AND (f.fin_de_registro_lotes AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
                GROUP BY f.id_factura_proveedor, f.id_empleado_registro_lotes, f.inicio_de_registro_lotes, f.fin_de_registro_lotes
            `, desde, hasta, 'artículo'), vacioProceso('artículo')),

            // CHECADO DE LA MERCANCÍA
            seguro('checado', resumir(`
                SELECT f.id_factura_proveedor AS id_pedido, f.id_empleado_checado AS id_empleado,
                       f.inicio_de_checado AS ini, f.fin_de_checado AS fin,
                       COUNT(DISTINCT d.id_factura_proveedor_detalle) AS volumen
                FROM factura_compra_proveedor f
                LEFT JOIN detalle_factura_compra_proveedor d ON d.id_factura_compra_proveedor = f.id_factura_proveedor
                WHERE ${FACTURA_COMPRA} AND f.fin_de_checado IS NOT NULL AND f.id_empleado_checado IS NOT NULL
                  AND (f.fin_de_checado AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
                GROUP BY f.id_factura_proveedor, f.id_empleado_checado, f.inicio_de_checado, f.fin_de_checado
            `, desde, hasta, 'artículo'), vacioProceso('artículo')),

            // ACOMODO DE LA MERCANCÍA — por artículo (ver resumirAcomodo)
            seguro('acomodo', resumirAcomodo(desde, hasta), vacioProceso('pieza')),

            // ÓRDENES de compra generadas en el periodo (sin las que siguen en captura)
            seguro('ordenes', consulta(`
                WITH o AS (
                    SELECT cp.id_comp, cp.idprove_comp, cp.fecha_enviada_proveedor,
                           COALESCE((SELECT SUM(d.cantidad_detcompsol * d.precio_detcompsol) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp), 0) AS monto,
                           COALESCE((SELECT SUM(d.cantidad_detcompsol) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp), 0) AS piezas
                    FROM compra_proveedor cp
                    WHERE cp.estado_comp <> 'C'
                      AND (cp.inicio_de_compra_proveedor AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
                )
                SELECT COUNT(*) AS ordenes, COUNT(DISTINCT idprove_comp) AS proveedores,
                       COALESCE(SUM(monto), 0) AS monto, COALESCE(SUM(piezas), 0) AS piezas,
                       COUNT(*) FILTER (WHERE fecha_enviada_proveedor IS NOT NULL) AS enviadas
                FROM o
            `, rep), []),

            // FACTURAS de proveedor registradas en el periodo.
            // Lo recibido se topa al facturado de CADA factura: una pieza de más en una no compensa lo que faltó en otra
            // (el surtido nunca pasa de 100%).
            seguro('facturas', consulta(`
                SELECT COUNT(*) AS facturas,
                       COALESCE(SUM(f.total_factura_proveedor), 0) AS monto,
                       COUNT(*) FILTER (WHERE f.fin_de_checado IS NOT NULL) AS checadas,
                       COALESCE(SUM(f.total_factura_proveedor) FILTER (WHERE f.fin_de_checado IS NOT NULL), 0) AS monto_checado,
                       COALESCE(SUM(LEAST(f.total_recibido_factura, f.total_factura_proveedor)) FILTER (WHERE f.fin_de_checado IS NOT NULL), 0) AS monto_recibido,
                       COUNT(*) FILTER (WHERE f.estado_factura_proveedor = 'D') AS con_devolucion
                FROM factura_compra_proveedor f
                WHERE ${FACTURA_COMPRA} AND ${REGISTRADA_EN_RANGO}
            `, rep), []),

            // LOTES y piezas registradas en esas facturas
            seguro('lotes', consulta(`
                SELECT COUNT(*) AS lotes, COALESCE(SUM(l.cantidad_lote), 0) AS piezas
                FROM lote_factura_compra_proveedor l
                JOIN detalle_factura_compra_proveedor d ON d.id_factura_proveedor_detalle = l.id_det_factura_proveedor
                JOIN factura_compra_proveedor f ON f.id_factura_proveedor = d.id_factura_compra_proveedor
                WHERE ${FACTURA_COMPRA} AND ${REGISTRADA_EN_RANGO}
            `, rep), []),

            // NOTAS DE CRÉDITO de proveedor emitidas en el periodo
            seguro('notas', consulta(`
                SELECT COUNT(*) AS notas, COALESCE(SUM(total_nc), 0) AS monto
                FROM notas_credito_proveedor
                WHERE fecha_emision::date BETWEEN :desde AND :hasta
            `, rep), []),

            // CICLO COMPLETO de recepción: factura registrada → mercancía acomodada
            seguro('ciclo', consulta(`
                SELECT COUNT(*) AS n,
                       AVG(EXTRACT(EPOCH FROM (f.fin_acomodo_mercancia - f.inicio_de_registro_lotes))) AS promedio,
                       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (f.fin_acomodo_mercancia - f.inicio_de_registro_lotes))) AS mediana
                FROM factura_compra_proveedor f
                WHERE ${FACTURA_COMPRA}
                  AND f.fin_acomodo_mercancia IS NOT NULL AND f.inicio_de_registro_lotes IS NOT NULL
                  AND f.fin_acomodo_mercancia > f.inicio_de_registro_lotes
                  AND (f.fin_acomodo_mercancia AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
            `, rep), []),

            // FACTURAS POR DÍA
            seguro('por_dia', consulta(`
                SELECT (f.inicio_de_registro_lotes AT TIME ZONE ${TZ})::date::text AS fecha,
                       COUNT(*) AS facturas, COALESCE(SUM(f.total_factura_proveedor), 0) AS monto
                FROM factura_compra_proveedor f
                WHERE ${FACTURA_COMPRA} AND ${REGISTRADA_EN_RANGO}
                GROUP BY 1 ORDER BY 1
            `, rep), []),

            // PROVEEDORES del periodo: monto, qué tanto surtieron y cuánto tardan en entregar (envío de la orden → checada)
            seguro('proveedores', consulta(`
                SELECT p.id_prove AS id_proveedor, p.nomcort_prove AS proveedor,
                       COUNT(*) AS facturas,
                       COALESCE(SUM(f.total_factura_proveedor), 0) AS monto,
                       COALESCE(SUM(f.total_factura_proveedor) FILTER (WHERE f.fin_de_checado IS NOT NULL), 0) AS monto_checado,
                       COALESCE(SUM(LEAST(f.total_recibido_factura, f.total_factura_proveedor)) FILTER (WHERE f.fin_de_checado IS NOT NULL), 0) AS monto_recibido,
                       AVG(EXTRACT(EPOCH FROM (f.fin_de_checado - cp.fecha_enviada_proveedor)) / 86400.0)
                           FILTER (WHERE cp.fecha_enviada_proveedor IS NOT NULL
                                     AND f.fin_de_checado IS NOT NULL
                                     AND f.fin_de_checado > cp.fecha_enviada_proveedor) AS dias_entrega
                FROM factura_compra_proveedor f
                JOIN compra_proveedor cp ON cp.id_comp = f.id_compra_prove_factura
                JOIN proveedor p ON p.id_prove = cp.idprove_comp
                WHERE ${FACTURA_COMPRA} AND ${REGISTRADA_EN_RANGO}
                GROUP BY p.id_prove, p.nomcort_prove
                ORDER BY SUM(f.total_factura_proveedor) DESC NULLS LAST
                LIMIT 15
            `, rep), []),

            // PENDIENTE AHORA (facturas de los últimos 60 días: las más viejas casi siempre son históricos sin cerrar)
            seguro('pendiente_facturas', consulta(`
                SELECT COUNT(*) FILTER (WHERE f.estado_factura_proveedor = 'E') AS por_registrar,
                       MIN(f.inicio_de_registro_lotes) FILTER (WHERE f.estado_factura_proveedor = 'E') AS registrar_antigua,
                       COUNT(*) FILTER (WHERE f.estado_factura_proveedor IN ('C', 'R')) AS por_checar,
                       MIN(COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes)) FILTER (WHERE f.estado_factura_proveedor IN ('C', 'R')) AS checar_antigua
                FROM factura_compra_proveedor f
                WHERE ${FACTURA_COMPRA} AND f.inicio_de_registro_lotes >= NOW() - INTERVAL '60 days'
            `, rep), []),

            // SIN ACOMODAR: renglones de stock sin ubicación (lo que falta por acomodar en el almacén)
            seguro('pendiente_acomodo', consulta(`
                SELECT COUNT(*) AS n, COALESCE(SUM(s.cantidad), 0) AS piezas, MIN(s."createdAt") AS antigua
                FROM stock_ubicacion_lote s
                WHERE s.id_ubicacion_sucursal IS NULL AND s.cantidad > 0
            `, rep), []),

            // ÓRDENES ya enviadas al proveedor y todavía sin llegar
            seguro('pendiente_ordenes', consulta(`
                SELECT COUNT(*) AS n, MIN(cp.fecha_enviada_proveedor) AS antigua,
                       COALESCE(SUM((SELECT SUM(d.cantidad_detcompsol * d.precio_detcompsol) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp)), 0) AS monto
                FROM compra_proveedor cp
                WHERE cp.estado_comp = 'E'
            `, rep), []),
        ]);

        const o = ordenes[0] ?? {};
        const f = facturas[0] ?? {};
        const l = lotes[0] ?? {};
        const nc = notas[0] ?? {};
        const c = ciclo[0] ?? {};
        const pf = pendFact[0] ?? {};
        const po = pendOrd[0] ?? {};
        const pa = pendAcomodo[0] ?? {};

        const montoChecado = num(f.monto_checado);
        const montoRecibido = num(f.monto_recibido);
        const iso = (v: unknown) => (v ? new Date(v as any).toISOString() : null);

        return {
            desde, hasta,
            limite_horas: MAX_SEG_PROCESO / 3600,
            procesos: { captura, registro_lotes: registroLotes, checado, acomodo },
            periodo: {
                ordenes: num(o.ordenes),
                proveedores: num(o.proveedores),
                monto_ordenado: r2(num(o.monto)),
                piezas_ordenadas: num(o.piezas),
                ordenes_enviadas: num(o.enviadas),
                facturas: num(f.facturas),
                monto_facturado: r2(num(f.monto)),
                facturas_checadas: num(f.checadas),
                monto_checado: r2(montoChecado),
                monto_recibido: r2(montoRecibido),
                surtido_pct: montoChecado > 0 ? Math.round((montoRecibido / montoChecado) * 1000) / 10 : null,
                facturas_con_devolucion: num(f.con_devolucion),
                lotes: num(l.lotes),
                piezas_lotes: num(l.piezas),
                notas_credito: num(nc.notas),
                monto_notas_credito: r2(num(nc.monto)),
                ciclo_prom_seg: Math.round(num(c.promedio)),
                ciclo_mediana_seg: Math.round(num(c.mediana)),
                ciclo_n: num(c.n),
            },
            por_dia: porDia.map(r => ({ fecha: String(r.fecha), facturas: num(r.facturas), monto: r2(num(r.monto)) })),
            proveedores: proveedores.map(r => {
                const mc = num(r.monto_checado);
                return {
                    id_proveedor: r.id_proveedor,
                    proveedor: r.proveedor ?? 'Sin nombre',
                    facturas: num(r.facturas),
                    monto: r2(num(r.monto)),
                    surtido_pct: mc > 0 ? Math.round((num(r.monto_recibido) / mc) * 1000) / 10 : null,
                    dias_entrega: r.dias_entrega === null || r.dias_entrega === undefined ? null : Math.round(num(r.dias_entrega) * 10) / 10,
                };
            }),
            pendiente: {
                ordenes_esperando: num(po.n),
                monto_esperando: r2(num(po.monto)),
                orden_mas_antigua: iso(po.antigua),
                por_registrar_lotes: num(pf.por_registrar),
                registrar_mas_antigua: iso(pf.registrar_antigua),
                por_checar: num(pf.por_checar),
                checar_mas_antigua: iso(pf.checar_antigua),
                por_acomodar: num(pa.n),
                piezas_por_acomodar: num(pa.piezas),
                acomodar_mas_antigua: iso(pa.antigua),
            },
            generado: new Date().toISOString(),
        };
    },
};
