import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Gasto_Utilidad from '../model/Gasto_Utilidad';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD POR AGENTE (bruta) Y UTILIDAD NETA DEL MES
//
// Venta = cada pedido que ya se vendió, contado UNA sola vez:
//   · si tiene remisión → el subtotal de su(s) remisión(es), en la fecha de la remisión;
//   · si no, el subtotal de sus facturas de ingreso no canceladas, en la fecha de la primera factura.
//   (Las facturas de Público General que nacen de los abonos de una remisión no se cuentan aparte: el pedido ya cuenta por su remisión.)
//   · Vales de empleados: la factura que los consolida (origen VAL) trae TODOS los vales del periodo pero queda ligada solo al
//     primero, así que no sirve para repartir costos. Se cuenta cada vale facturado (status FA) con su propio precio y costo,
//     en la fecha en que se facturó; la factura consolidada no se cuenta aparte.
// Costo = piezas surtidas de cada lote × el costo de ese lote.
// Utilidad bruta = venta − costo (sin IVA). Utilidad neta = bruta − gastos capturados del mes.
// Solo hay costo desde que los pedidos pasan por el sistema nuevo (septiembre de 2026 en adelante).
// Las devoluciones de clientes todavía no se descuentan (son una fracción mínima).
// ─────────────────────────────────────────────────────────────────────────────

const ZONA = 'America/Mazatlan';
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v: any) => Number(v) || 0;

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function validarMes(mes: string): string {
    if (!MES_RE.test(String(mes ?? ''))) throw Object.assign(new Error('El mes debe venir como AAAA-MM.'), { status: 400 });
    return mes;
}
// 'AAAA-MM' → rango [desde, hasta) en fechas 'AAAA-MM-DD'
function rangoMes(mes: string) {
    const [y, m] = mes.split('-').map(Number);
    const sig = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return { desde: `${mes}-01`, hasta: `${sig}-01` };
}
function rangoAnio(anio: number) {
    return { desde: `${anio}-01-01`, hasta: `${anio + 1}-01-01` };
}

type FilaVenta = { mes: string; id_agente: string | null; pedidos: number; ventas: number; costo: number; sin_costo: number };

const CTE_VENTAS = `
        WITH venta AS (
            SELECT p.id_pedido_alm AS id_pedido, p.id_agente_pedido_alm AS id_agente,
                   MIN(r.fecha_remision) AS fecha, SUM(r.subtotal_remision)::float AS sub,
                   'REM' AS origen, STRING_AGG('REM-' || r.folio_remision::text, ', ' ORDER BY r.folio_remision) AS docs
            FROM remision r
            JOIN pedido_almacen p ON p.id_pedido_alm = r.id_pedido_alm
            GROUP BY p.id_pedido_alm, p.id_agente_pedido_alm
            UNION ALL
            SELECT p.id_pedido_alm, p.id_agente_pedido_alm,
                   MIN((f.fecha_emision AT TIME ZONE '${ZONA}')::date), SUM(f.subtotal_factura)::float,
                   'FAC', STRING_AGG(f.folio_factura::text, ', ' ORDER BY f.folio_factura)
            FROM facturas f
            JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
            WHERE f.tipo_cfdi = 'I' AND f.estatus_factura <> 'CAN' AND f.origen_factura <> 'VAL'
              AND NOT EXISTS (SELECT 1 FROM remision r WHERE r.id_pedido_alm = p.id_pedido_alm)
            GROUP BY p.id_pedido_alm, p.id_agente_pedido_alm
            UNION ALL
            SELECT p.id_pedido_alm, p.id_agente_pedido_alm,
                   (p.fecha_facturado_pedido_alm AT TIME ZONE '${ZONA}')::date,
                   (SELECT SUM(d.cant_pedida * d.precio_venta) FROM detalle_pedido_almacen d WHERE d.id_pedido_almacen = p.id_pedido_alm)::float,
                   'VAL',
                   COALESCE((SELECT STRING_AGG(f2.folio_factura::text, ', ') FROM facturas f2
                              WHERE f2.origen_factura = 'VAL' AND f2.estatus_factura <> 'CAN'
                                AND (f2.fecha_emision AT TIME ZONE '${ZONA}')::date = (p.fecha_facturado_pedido_alm AT TIME ZONE '${ZONA}')::date), 'VALE')
            FROM pedido_almacen p
            WHERE p.origen_pedido = 'VALE' AND p.status_pedido_alm = 'FA' AND p.fecha_facturado_pedido_alm IS NOT NULL
        ), costo AS (
            SELECT d.id_pedido_almacen AS id_pedido,
                   SUM(l.cantidad * COALESCE(lo.precio_costo_lote_sucursal, 0))::float AS c
            FROM detalle_pedido_almacen d
            JOIN detalle_pedido_almacen_lote l ON l.id_detalle_pedido_almacen = d.id_detalle_pedido_almacen
            JOIN lote_articulo_sucursal lo ON lo.id_lote_sucursal = l.id_lote_sucursal
            GROUP BY d.id_pedido_almacen
        )
`;

// Ventas y costos agrupados por mes y agente dentro de un rango de fechas
async function ventasPorMesYAgente(desde: string, hasta: string): Promise<FilaVenta[]> {
    const filas = await dbLocal.query<any>(`
        ${CTE_VENTAS}
        SELECT to_char(v.fecha, 'YYYY-MM') AS mes, v.id_agente,
               COUNT(*)::int AS pedidos,
               COALESCE(SUM(v.sub), 0)::float AS ventas,
               COALESCE(SUM(COALESCE(c.c, 0)), 0)::float AS costo,
               COUNT(*) FILTER (WHERE c.c IS NULL OR c.c = 0)::int AS sin_costo
        FROM venta v
        LEFT JOIN costo c ON c.id_pedido = v.id_pedido
        WHERE v.fecha >= :desde AND v.fecha < :hasta
        GROUP BY 1, 2
    `, { replacements: { desde, hasta }, type: QueryTypes.SELECT }) as any[];
    return filas.map(f => ({
        mes: String(f.mes), id_agente: f.id_agente ?? null, pedidos: num(f.pedidos),
        ventas: num(f.ventas), costo: num(f.costo), sin_costo: num(f.sin_costo),
    }));
}

async function agentes() {
    return await dbLocal.query<any>(`
        SELECT a.id_agente, a.cod_identi_agente AS codigo, a.estatus_agente AS activo,
               NULLIF(TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado)), '') AS nombre
        FROM agente_de_venta a
        LEFT JOIN empleado e ON e.id_empleado = a.id_empleado
        ORDER BY a.cod_identi_agente
    `, { type: QueryTypes.SELECT }) as { id_agente: string; codigo: string; activo: boolean; nombre: string | null }[];
}

const mesDe = (fecha: any) => String(fecha).slice(0, 7);

export interface IPedidoUtilidad {
    id_pedido: string; pedido: string | null; fecha: string; origen: 'REM' | 'FAC' | 'VAL'; documento: string | null;
    ventas: number; costo: number; utilidad: number; margen: number | null; sin_costo: boolean;
}
export interface IClienteUtilidad {
    id_cliente_alm: string | null; nombre_corto: string | null; razon_social: string | null;
    pedidos: number; ventas: number; costo: number; utilidad: number; margen: number | null;
    detalle: IPedidoUtilidad[];
}

export const UtilidadService = {

    // Un pedido renglón por renglón: lo que se vendió (según su remisión o sus facturas) contra lo que costó (lotes surtidos).
    detallePedido: async (idPedido: string) => {
        if (!/^[0-9a-f-]{36}$/i.test(String(idPedido ?? ''))) throw Object.assign(new Error('Pedido no válido.'), { status: 400 });
        const [cab] = await dbLocal.query<any>(`
            SELECT p.cod_int_pedido_alm AS pedido, p.origen_pedido, a.cod_identi_agente AS agente,
                   cl.nom_corto_cliente_alm AS nombre_corto, cl.razon_social_cliente_alm AS razon_social,
                   (SELECT STRING_AGG('REM-' || r.folio_remision::text, ', ' ORDER BY r.folio_remision) FROM remision r WHERE r.id_pedido_alm = p.id_pedido_alm) AS remisiones,
                   (SELECT STRING_AGG(f.folio_factura::text, ', ' ORDER BY f.folio_factura) FROM facturas f
                     WHERE f.id_pedido_alm = p.id_pedido_alm AND f.tipo_cfdi = 'I' AND f.estatus_factura <> 'CAN') AS facturas
            FROM pedido_almacen p
            LEFT JOIN agente_de_venta a ON a.id_agente = p.id_agente_pedido_alm
            LEFT JOIN cliente_almacen cl ON cl.id_cliente_alm = p.id_cliente_pedido_alm
            WHERE p.id_pedido_alm = :id
        `, { replacements: { id: idPedido }, type: QueryTypes.SELECT });
        if (!cab) throw Object.assign(new Error('El pedido no existe.'), { status: 404 });

        const esVale = cab.origen_pedido === 'VALE';
        const docsVale = `
                SELECT d.id_articulo, MAX(ar2.des_artic) AS descripcion, SUM(d.cant_pedida)::float AS cantidad, SUM(d.cant_pedida * d.precio_venta)::float AS ventas
                FROM detalle_pedido_almacen d LEFT JOIN articulo ar2 ON ar2.id_artic = d.id_articulo
                WHERE d.id_pedido_almacen = :id
                GROUP BY d.id_articulo`;
        const docsNormal = `
                SELECT d.id_articulo, MAX(d.descripcion_articulo) AS descripcion, SUM(d.cantidad)::float AS cantidad, SUM(d.subtotal)::float AS ventas
                FROM detalle_remision d JOIN remision r ON r.id_remision = d.id_remision
                WHERE r.id_pedido_alm = :id
                GROUP BY d.id_articulo, CASE WHEN d.id_articulo IS NULL THEN d.descripcion_articulo END
                UNION ALL
                SELECT d.id_articulo, MAX(d.descripcion_articulo), SUM(d.cantidad_facturada)::float, SUM(d.subtotal)::float
                FROM detalle_factura d JOIN facturas f ON f.id_factura = d.id_factura
                WHERE f.id_pedido_alm = :id AND f.tipo_cfdi = 'I' AND f.estatus_factura <> 'CAN' AND f.origen_factura <> 'VAL'
                  AND NOT EXISTS (SELECT 1 FROM remision r WHERE r.id_pedido_alm = f.id_pedido_alm)
                GROUP BY d.id_articulo, CASE WHEN d.id_articulo IS NULL THEN d.descripcion_articulo END`;
        const filas = await dbLocal.query<any>(`
            WITH docs AS (${esVale ? docsVale : docsNormal}
            ), costo AS (
                SELECT dp.id_articulo, SUM(l.cantidad)::float AS pz_costeadas,
                       SUM(l.cantidad * COALESCE(lo.precio_costo_lote_sucursal, 0))::float AS costo
                FROM detalle_pedido_almacen dp
                JOIN detalle_pedido_almacen_lote l ON l.id_detalle_pedido_almacen = dp.id_detalle_pedido_almacen
                JOIN lote_articulo_sucursal lo ON lo.id_lote_sucursal = l.id_lote_sucursal
                WHERE dp.id_pedido_almacen = :id
                GROUP BY dp.id_articulo
            )
            SELECT COALESCE(d.id_articulo, c.id_articulo) AS id_articulo, ar.cod_int_artic AS codigo,
                   COALESCE(ar.des_artic, d.descripcion) AS descripcion,
                   COALESCE(d.cantidad, 0) AS cantidad, COALESCE(d.ventas, 0) AS ventas,
                   COALESCE(c.costo, 0) AS costo, COALESCE(c.pz_costeadas, 0) AS pz_costeadas
            FROM docs d
            FULL OUTER JOIN costo c ON c.id_articulo = d.id_articulo
            LEFT JOIN articulo ar ON ar.id_artic = COALESCE(d.id_articulo, c.id_articulo)
        `, { replacements: { id: idPedido }, type: QueryTypes.SELECT }) as any[];

        const renglones = filas.map(f => {
            const cantidad = num(f.cantidad), ventas = num(f.ventas), costo = num(f.costo), pz = num(f.pz_costeadas);
            return {
                codigo: f.codigo ?? null,
                articulo: f.descripcion ? String(f.descripcion).trim() : '(sin descripción)',
                cantidad,
                precio_unitario: cantidad > 0 ? round2(ventas / cantidad) : 0,
                ventas: round2(ventas),
                costo_unitario: pz > 0 ? round2(costo / pz) : 0,
                costo: round2(costo),
                utilidad: round2(ventas - costo),
                margen: ventas > 0 ? Math.round(((ventas - costo) / ventas) * 1000) / 10 : null,
                sin_costo: ventas > 0 && costo === 0,
                // lo surtido con costo no es lo mismo que lo facturado: se avisa para que se revise
                piezas_distintas: pz > 0 && cantidad > 0 && Math.abs(pz - cantidad) > 0.0001,
            };
        }).sort((a, b) => b.ventas - a.ventas);

        const ventasT = renglones.reduce((s, r) => s + r.ventas, 0), costoT = renglones.reduce((s, r) => s + r.costo, 0);
        return {
            pedido: cab.pedido, agente: cab.agente ?? null,
            cliente: (cab.nombre_corto || cab.razon_social || '').toString().trim() || (esVale ? 'Vales' : null),
            documentos: esVale ? 'Vale de empleado' : ([cab.remisiones, cab.facturas].filter(Boolean).join(' · ') || null),
            renglones,
            totales: {
                renglones: renglones.length, piezas: round2(renglones.reduce((s, r) => s + r.cantidad, 0)),
                ventas: round2(ventasT), costo: round2(costoT), utilidad: round2(ventasT - costoT),
                margen: ventasT > 0 ? Math.round(((ventasT - costoT) / ventasT) * 1000) / 10 : null,
            },
        };
    },

    // Detalle de un mes: por cliente y, dentro de cada cliente, por pedido. idAgente: 'sin' = pedidos sin agente; vacío = todos los agentes.
    detalleMes: async (mesParam: string, idAgente?: string) => {
        const mes = validarMes(mesParam);
        const { desde, hasta } = rangoMes(mes);
        const filtroAgente = !idAgente ? '' : idAgente === 'sin' ? 'AND v.id_agente IS NULL' : 'AND v.id_agente = :agente';
        const filas = await dbLocal.query<any>(`
            ${CTE_VENTAS}
            SELECT v.id_pedido, p.cod_int_pedido_alm AS pedido, v.fecha, v.origen, v.docs AS documento,
                   v.sub AS ventas, COALESCE(c.c, 0) AS costo, (c.c IS NULL OR c.c = 0) AS sin_costo,
                   cl.id_cliente_alm, cl.nom_corto_cliente_alm AS nombre_corto, cl.razon_social_cliente_alm AS razon_social
            FROM venta v
            JOIN pedido_almacen p ON p.id_pedido_alm = v.id_pedido
            LEFT JOIN cliente_almacen cl ON cl.id_cliente_alm = p.id_cliente_pedido_alm
            LEFT JOIN costo c ON c.id_pedido = v.id_pedido
            WHERE v.fecha >= :desde AND v.fecha < :hasta ${filtroAgente}
            ORDER BY v.fecha, p.cod_int_pedido_alm
        `, { replacements: { desde, hasta, agente: idAgente }, type: QueryTypes.SELECT }) as any[];

        const porCliente = new Map<string, IClienteUtilidad>();
        for (const f of filas) {
            const clave = f.id_cliente_alm ?? 'sin';
            const c = porCliente.get(clave) ?? {
                id_cliente_alm: f.id_cliente_alm ?? null, nombre_corto: f.nombre_corto ? String(f.nombre_corto).trim() : null,
                razon_social: f.razon_social ? String(f.razon_social).trim() : null,
                pedidos: 0, ventas: 0, costo: 0, utilidad: 0, margen: null, detalle: [],
            } as IClienteUtilidad;
            const ventas = num(f.ventas), costo = num(f.costo);
            c.pedidos += 1; c.ventas += ventas; c.costo += costo;
            c.detalle.push({
                id_pedido: f.id_pedido, pedido: f.pedido ?? null, fecha: String(f.fecha).slice(0, 10), origen: f.origen, documento: f.documento ?? null,
                ventas: round2(ventas), costo: round2(costo), utilidad: round2(ventas - costo),
                margen: ventas > 0 ? Math.round(((ventas - costo) / ventas) * 1000) / 10 : null, sin_costo: !!f.sin_costo,
            });
            porCliente.set(clave, c);
        }
        const clientes = Array.from(porCliente.values()).map(c => {
            const utilidad = c.ventas - c.costo;
            return { ...c, ventas: round2(c.ventas), costo: round2(c.costo), utilidad: round2(utilidad), margen: c.ventas > 0 ? Math.round((utilidad / c.ventas) * 1000) / 10 : null };
        }).sort((a, b) => b.utilidad - a.utilidad);

        const ventasT = clientes.reduce((s, c) => s + c.ventas, 0), costoT = clientes.reduce((s, c) => s + c.costo, 0);
        let agente: { codigo: string; nombre: string | null } | null = null;
        if (idAgente && idAgente !== 'sin') {
            const a = (await agentes()).find(x => x.id_agente === idAgente);
            agente = a ? { codigo: a.codigo, nombre: a.nombre } : null;
        } else if (idAgente === 'sin') agente = { codigo: '(sin agente)', nombre: null };
        return {
            mes, agente, clientes,
            totales: {
                clientes: clientes.length, pedidos: clientes.reduce((s, c) => s + c.pedidos, 0),
                ventas: round2(ventasT), costo: round2(costoT), utilidad: round2(ventasT - costoT),
                margen: ventasT > 0 ? Math.round(((ventasT - costoT) / ventasT) * 1000) / 10 : null,
            },
        };
    },

    // Utilidad por agente de un mes + gastos del mes + utilidad neta
    resumenMes: async (mesParam: string) => {
        const mes = validarMes(mesParam);
        const { desde, hasta } = rangoMes(mes);
        const [filas, listaAgentes, gastos, sinCosto] = await Promise.all([
            ventasPorMesYAgente(desde, hasta),
            agentes(),
            Gasto_Utilidad.findAll({ where: { mes: desde }, order: [['createdAt', 'ASC']], raw: true }) as Promise<any[]>,
            // Pedidos del mes cuyo costo no se pudo calcular (ningún renglón con lote asignado)
            dbLocal.query<any>(`
                ${CTE_VENTAS}
                SELECT v.id_pedido, p.cod_int_pedido_alm AS pedido, v.origen, v.docs AS documento, v.fecha,
                       a.cod_identi_agente AS agente, v.sub AS ventas,
                       COALESCE(cl.nom_corto_cliente_alm, cl.razon_social_cliente_alm) AS cliente
                FROM venta v
                JOIN pedido_almacen p ON p.id_pedido_alm = v.id_pedido
                LEFT JOIN costo c ON c.id_pedido = v.id_pedido
                LEFT JOIN agente_de_venta a ON a.id_agente = v.id_agente
                LEFT JOIN cliente_almacen cl ON cl.id_cliente_alm = p.id_cliente_pedido_alm
                WHERE (c.c IS NULL OR c.c = 0) AND v.fecha >= :desde AND v.fecha < :hasta
                ORDER BY v.fecha
            `, { replacements: { desde, hasta }, type: QueryTypes.SELECT }) as Promise<any[]>,
        ]);

        const gastosPorAgente = new Map<string | null, number>();
        for (const g of gastos) gastosPorAgente.set(g.id_agente ?? null, (gastosPorAgente.get(g.id_agente ?? null) ?? 0) + num(g.monto));

        const porAgente = new Map<string | null, FilaVenta>(filas.map(f => [f.id_agente, f]));
        const ids = new Set<string | null>([...porAgente.keys(), ...Array.from(gastosPorAgente.keys()).filter(k => k !== null)]);
        const infoAgente = new Map(listaAgentes.map(a => [a.id_agente, a]));

        const lineas = Array.from(ids).map(id => {
            const v = porAgente.get(id);
            const ventas = v?.ventas ?? 0, costo = v?.costo ?? 0;
            const bruta = ventas - costo;
            const gastosAg = gastosPorAgente.get(id) ?? 0;
            const a = id ? infoAgente.get(id) : null;
            return {
                id_agente: id,
                codigo: a?.codigo ?? '(sin agente)',
                nombre: a?.nombre ?? null,
                pedidos: v?.pedidos ?? 0,
                pedidos_sin_costo: v?.sin_costo ?? 0,
                ventas: round2(ventas),
                costo: round2(costo),
                utilidad_bruta: round2(bruta),
                margen: ventas > 0 ? Math.round((bruta / ventas) * 1000) / 10 : null,
                gastos_asignados: round2(gastosAg),
                utilidad_neta_agente: round2(bruta - gastosAg),
            };
        }).sort((a, b) => b.utilidad_bruta - a.utilidad_bruta);

        const ventasT = lineas.reduce((s, l) => s + l.ventas, 0);
        const costoT = lineas.reduce((s, l) => s + l.costo, 0);
        const brutaT = ventasT - costoT;
        const gastosT = gastos.reduce((s, g) => s + num(g.monto), 0);
        const gastosGenerales = gastosPorAgente.get(null) ?? 0;

        return {
            mes,
            agentes: lineas,
            pedidos_sin_costo_lista: sinCosto.map(x => ({
                id_pedido: x.id_pedido, pedido: x.pedido, origen: x.origen, documento: x.documento ?? null,
                fecha: String(x.fecha).slice(0, 10), agente: x.agente ?? null,
                cliente: x.cliente ? String(x.cliente).trim() : (x.origen === 'VAL' ? 'Vales' : null), ventas: round2(num(x.ventas)),
            })),
            agentes_catalogo: listaAgentes.filter(a => a.activo).map(a => ({ id_agente: a.id_agente, codigo: a.codigo, nombre: a.nombre })),
            gastos: gastos.map(g => ({
                id_gasto_utilidad: g.id_gasto_utilidad, mes: mesDe(g.mes), concepto: g.concepto, categoria: g.categoria,
                monto: round2(num(g.monto)), id_agente: g.id_agente ?? null,
                agente: g.id_agente ? (infoAgente.get(g.id_agente)?.codigo ?? null) : null, notas: g.notas,
            })),
            totales: {
                ventas: round2(ventasT),
                costo: round2(costoT),
                utilidad_bruta: round2(brutaT),
                margen: ventasT > 0 ? Math.round((brutaT / ventasT) * 1000) / 10 : null,
                gastos_agentes: round2(gastosT - gastosGenerales),
                gastos_generales: round2(gastosGenerales),
                gastos: round2(gastosT),
                utilidad_neta: round2(brutaT - gastosT),
                pedidos: lineas.reduce((s, l) => s + l.pedidos, 0),
                pedidos_sin_costo: lineas.reduce((s, l) => s + l.pedidos_sin_costo, 0),
            },
        };
    },

    // Mes por mes de un año: ventas, costo, bruta, gastos y neta
    resumenAnual: async (anio: number) => {
        if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) throw Object.assign(new Error('Año no válido.'), { status: 400 });
        const { desde, hasta } = rangoAnio(anio);
        const [filas, gastos] = await Promise.all([
            ventasPorMesYAgente(desde, hasta),
            Gasto_Utilidad.findAll({ where: dbLocal.where(dbLocal.fn('date_part', 'year', dbLocal.col('mes')), anio), raw: true }) as Promise<any[]>,
        ]);
        const meses = Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`);
        const filaMes = meses.map(mes => {
            const delMes = filas.filter(f => f.mes === mes);
            const ventas = delMes.reduce((s, f) => s + f.ventas, 0);
            const costo = delMes.reduce((s, f) => s + f.costo, 0);
            const gastosMes = gastos.filter(g => mesDe(g.mes) === mes).reduce((s, g) => s + num(g.monto), 0);
            const bruta = ventas - costo;
            return {
                mes,
                pedidos: delMes.reduce((s, f) => s + f.pedidos, 0),
                ventas: round2(ventas), costo: round2(costo),
                utilidad_bruta: round2(bruta),
                margen: ventas > 0 ? Math.round((bruta / ventas) * 1000) / 10 : null,
                gastos: round2(gastosMes),
                utilidad_neta: round2(bruta - gastosMes),
            };
        });
        const suma = (k: 'ventas' | 'costo' | 'utilidad_bruta' | 'gastos' | 'utilidad_neta') => round2(filaMes.reduce((s, m) => s + m[k], 0));
        return {
            anio,
            meses: filaMes,
            totales: { ventas: suma('ventas'), costo: suma('costo'), utilidad_bruta: suma('utilidad_bruta'), gastos: suma('gastos'), utilidad_neta: suma('utilidad_neta') },
        };
    },

    // ── Gastos ──────────────────────────────────────────────────────────────
    crearGasto: async (d: { mes: string; concepto: string; categoria?: string | null; monto: number; id_agente?: string | null; notas?: string | null }, usuario?: string) => {
        const mes = validarMes(d.mes);
        const concepto = String(d.concepto ?? '').trim();
        const monto = round2(num(d.monto));
        if (!concepto) throw Object.assign(new Error('Escribe el concepto del gasto.'), { status: 400 });
        if (!(monto > 0)) throw Object.assign(new Error('El monto debe ser mayor a cero.'), { status: 400 });
        const g = await Gasto_Utilidad.create({
            mes: `${mes}-01`, concepto: concepto.slice(0, 150), categoria: d.categoria ? String(d.categoria).trim().slice(0, 60) : null,
            monto, id_agente: d.id_agente || null, notas: d.notas ? String(d.notas).trim() : null, registrado_por: usuario ?? null,
        } as any);
        return g;
    },

    actualizarGasto: async (id: string, d: { mes?: string; concepto?: string; categoria?: string | null; monto?: number; id_agente?: string | null; notas?: string | null }) => {
        const g = await Gasto_Utilidad.findByPk(id);
        if (!g) throw Object.assign(new Error('El gasto no existe.'), { status: 404 });
        const cambios: any = {};
        if (d.mes !== undefined) cambios.mes = `${validarMes(d.mes)}-01`;
        if (d.concepto !== undefined) {
            const c = String(d.concepto).trim();
            if (!c) throw Object.assign(new Error('Escribe el concepto del gasto.'), { status: 400 });
            cambios.concepto = c.slice(0, 150);
        }
        if (d.categoria !== undefined) cambios.categoria = d.categoria ? String(d.categoria).trim().slice(0, 60) : null;
        if (d.monto !== undefined) {
            const m = round2(num(d.monto));
            if (!(m > 0)) throw Object.assign(new Error('El monto debe ser mayor a cero.'), { status: 400 });
            cambios.monto = m;
        }
        if (d.id_agente !== undefined) cambios.id_agente = d.id_agente || null;
        if (d.notas !== undefined) cambios.notas = d.notas ? String(d.notas).trim() : null;
        await g.update(cambios);
        return g;
    },

    eliminarGasto: async (id: string) => {
        const n = await Gasto_Utilidad.destroy({ where: { id_gasto_utilidad: id } });
        if (!n) throw Object.assign(new Error('El gasto no existe.'), { status: 404 });
    },

    // Copia los gastos de un mes a otro (para los que se repiten: renta, sueldos…). No duplica los que ya estén con el mismo concepto y agente.
    copiarGastos: async (desdeMes: string, haciaMes: string, usuario?: string) => {
        const origen = validarMes(desdeMes), destino = validarMes(haciaMes);
        if (origen === destino) throw Object.assign(new Error('Elige dos meses distintos.'), { status: 400 });
        const [delOrigen, delDestino] = await Promise.all([
            Gasto_Utilidad.findAll({ where: { mes: `${origen}-01` }, raw: true }) as Promise<any[]>,
            Gasto_Utilidad.findAll({ where: { mes: `${destino}-01` }, raw: true }) as Promise<any[]>,
        ]);
        const yaEsta = new Set(delDestino.map(g => `${String(g.concepto).toLowerCase()}|${g.id_agente ?? ''}`));
        const nuevos = delOrigen.filter(g => !yaEsta.has(`${String(g.concepto).toLowerCase()}|${g.id_agente ?? ''}`));
        for (const g of nuevos) {
            await Gasto_Utilidad.create({
                mes: `${destino}-01`, concepto: g.concepto, categoria: g.categoria, monto: g.monto,
                id_agente: g.id_agente ?? null, notas: g.notas, registrado_por: usuario ?? null,
            } as any);
        }
        return { copiados: nuevos.length, omitidos: delOrigen.length - nuevos.length };
    },
};
