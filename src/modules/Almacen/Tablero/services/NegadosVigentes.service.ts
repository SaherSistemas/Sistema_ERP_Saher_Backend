import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

export type EstadoNegado = 'YA_ENTRO' | 'ENTRO_PARCIAL' | 'EN_RECIBO' | 'EN_CAMINO' | 'SIN_COMPRAR';
export type FiltroNegados = 'todos' | 'entro' | 'recibo' | 'camino' | 'sin';

const ESTADOS_POR_FILTRO: Record<FiltroNegados, EstadoNegado[]> = {
    todos: [],
    entro: ['YA_ENTRO', 'ENTRO_PARCIAL'],
    recibo: ['EN_RECIBO'],
    camino: ['EN_CAMINO'],
    sin: ['SIN_COMPRAR'],
};

// Mismos criterios que la lista de Negados de Nueva Compra: no recuperados y de los últimos 7 días, de cualquier motivo
const NEGADOS_VIGENTES = `n.recuperado = false AND n.fecha + INTERVAL '7 days' >= NOW()`;

// Cálculo completo (se cachea unos segundos para que cambiar de filtro/página no lo repita):
// es lo más pesado porque cruza cada artículo con el Kardex.
const CACHE_MS = 45_000;
const cache = new Map<string, { t: number; p: Promise<any[]> }>();

// Negados vigentes y en qué punto va cada uno:
//  · Ya entró     → entradas al almacén (Kardex ENTRADA, sin contar devoluciones de clientes) desde que se negó.
//  · En recibo    → ya llegó y está capturado en una factura de proveedor, falta checarla (igual que Compras).
//  · En tránsito  → orden de compra en tránsito (estados C, A, E, L, K, igual que Compras), con el proveedor.
//  · Sin comprar  → nada de lo anterior: sigue pendiente de comprar.
//
// `ids` limita el cálculo a esos artículos (la página que se está viendo): así la primera página sale rápido.
const consultar = async (id_empresa: string, ids?: string[]) => {
    const filas = await dbLocal.query<any>(`
        WITH neg AS (
            SELECT dpa.id_articulo,
                   SUM(n.cantidad_negada)                                      AS negada,
                   MIN(n.fecha)                                                AS fecha_negado,
                   COUNT(DISTINCT pa.id_pedido_alm)                            AS pedidos,
                   STRING_AGG(DISTINCT CASE n.motivo
                       WHEN 'SIN_EXISTENCIA'     THEN 'Sin existencia'
                       WHEN 'NO_ENCONTRADO'      THEN 'No encontrado en ubicación'
                       WHEN 'INSUFICIENTE'       THEN 'Cantidad insuficiente en físico'
                       WHEN 'DAÑADO'             THEN 'Artículo dañado'
                       WHEN 'CADUCADO'           THEN 'Caducado / próximo a vencer'
                       WHEN 'DIFERENCIA_CHEQUEO' THEN 'Diferencia en chequeo'
                       WHEN 'NO_SURTIDO'         THEN 'No se surtió completo'
                       ELSE n.motivo END, ', ')                                AS motivos,
                   STRING_AGG(DISTINCT TRIM(CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado)), ', ') AS agentes
            FROM detalle_pedido_negado n
            JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
            LEFT JOIN pedido_almacen pa     ON pa.id_pedido_alm = dpa.id_pedido_almacen
            LEFT JOIN agente_de_venta av    ON av.id_agente = pa.id_agente_pedido_alm
            LEFT JOIN empleado e            ON e.id_empleado = av.id_empleado
            WHERE ${NEGADOS_VIGENTES}
              ${ids ? 'AND dpa.id_articulo IN (:ids)' : ''}
            GROUP BY dpa.id_articulo
        )
        SELECT a.id_artic, a.cod_int_artic, a.des_artic,
               neg.negada, neg.fecha_negado, neg.pedidos, neg.motivos, neg.agentes,
               neg.fecha_negado + INTERVAL '7 days'     AS fecha_limite,
               COALESCE(st.existencia, 0)               AS existencia,
               COALESCE(st.apartada, 0)                 AS apartada,
               COALESCE(cam.cant, 0)                    AS en_camino,
               cam.proveedores                          AS en_camino_proveedores,
               COALESCE(rec.cant, 0)                    AS en_recibo,
               COALESCE(ent.cant, 0)                    AS entro
        FROM neg
        JOIN articulo a ON a.id_artic = neg.id_articulo
        LEFT JOIN (
            SELECT id_articulo, SUM(cantidad) AS existencia, SUM(COALESCE(cantidad_apartada, 0)) AS apartada
            FROM stock_ubicacion_lote WHERE id_empresa_sucursal = :emp GROUP BY id_articulo
        ) st ON st.id_articulo = neg.id_articulo
        LEFT JOIN (
            SELECT d.idarticulo_detcompsol AS id_articulo, SUM(d.cantidad_detcompsol) AS cant,
                   STRING_AGG(DISTINCT regexp_replace(TRIM(pr.nomcort_prove), '[,\\s]+$', ''), ', ') AS proveedores
            FROM detalle_compra_solicitado d
            JOIN compra_proveedor c ON c.id_comp = d.idcompr_detcompsol
            LEFT JOIN proveedor pr ON pr.id_prove = c.idprove_comp
            WHERE c.estado_comp IN ('C', 'A', 'E', 'L', 'K')
            GROUP BY d.idarticulo_detcompsol
        ) cam ON cam.id_articulo = neg.id_articulo
        LEFT JOIN (
            SELECT dfcp.id_artic AS id_articulo, SUM(dfcp.cantidad_articulo_facturada) AS cant
            FROM detalle_factura_compra_proveedor dfcp
            JOIN factura_compra_proveedor fcp ON fcp.id_factura_proveedor = dfcp.id_factura_compra_proveedor
            WHERE dfcp.checado IS NOT TRUE AND fcp.estado_factura_proveedor NOT IN ('H', 'D')
            GROUP BY dfcp.id_artic
        ) rec ON rec.id_articulo = neg.id_articulo
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(k.cantidad_movimiento), 0) AS cant
            FROM kardex_movimientos_articulos k
            WHERE k.id_empresa = :emp AND k.id_articulo = neg.id_articulo
              AND k.tipo_movimiento = 'ENTRADA' AND k.fecha >= neg.fecha_negado
              AND COALESCE(k.notas, '') NOT ILIKE 'Devoluci%'
        ) ent ON true
        ORDER BY neg.fecha_negado ASC, a.des_artic ASC
    `, { replacements: { emp: id_empresa, ...(ids ? { ids } : {}) }, type: QueryTypes.SELECT }) as any[];

    return filas.map(r => {
        const negada = num(r.negada);
        const entro = num(r.entro);
        const enRecibo = num(r.en_recibo);
        const enCamino = num(r.en_camino);
        const estado: EstadoNegado =
            entro >= negada ? 'YA_ENTRO'
                : entro > 0 ? 'ENTRO_PARCIAL'
                    : enRecibo > 0 ? 'EN_RECIBO'
                        : enCamino > 0 ? 'EN_CAMINO' : 'SIN_COMPRAR';
        return {
            id_artic: r.id_artic as string,
            cod_int_artic: r.cod_int_artic as number,
            des_artic: r.des_artic as string,
            negada,
            pedidos: num(r.pedidos),
            motivos: (r.motivos ?? '') as string,
            agentes: (r.agentes ?? '') as string,
            fecha_negado: r.fecha_negado as string,
            fecha_limite: r.fecha_limite as string,
            existencia: num(r.existencia),
            disponible: Math.max(0, num(r.existencia) - num(r.apartada)),
            entro,
            en_recibo: enRecibo,
            en_camino: enCamino,
            en_camino_proveedores: (r.en_camino_proveedores ?? '') as string,
            estado,
        };
    });
};

type Articulo = Awaited<ReturnType<typeof consultar>>[number];

const resumenDe = (articulos: Articulo[]) => {
    const cuenta = (e: EstadoNegado[]) => articulos.filter(a => e.includes(a.estado)).length;
    return {
        ya_entro: cuenta(['YA_ENTRO', 'ENTRO_PARCIAL']),
        en_recibo: cuenta(['EN_RECIBO']),
        en_camino: cuenta(['EN_CAMINO']),
        sin_comprar: cuenta(['SIN_COMPRAR']),
    };
};

const completoCacheado = (id_empresa: string): Promise<Articulo[]> => {
    const previo = cache.get(id_empresa);
    if (previo && Date.now() - previo.t < CACHE_MS) return previo.p;
    const p = consultar(id_empresa);
    cache.set(id_empresa, { t: Date.now(), p });
    p.catch(() => { if (cache.get(id_empresa)?.p === p) cache.delete(id_empresa); });
    return p;
};

export const NegadosVigentesService = {

    // Lista completa y fresca (la usa Nueva Compra para "iniciar compra de los sin comprar")
    getLista: async (id_empresa: string) => {
        const articulos = await consultar(id_empresa);
        return {
            total: articulos.length,
            piezas: articulos.reduce((s, a) => s + a.negada, 0),
            resumen: resumenDe(articulos),
            articulos,
            generado: new Date().toISOString(),
        };
    },

    // Conteos de los filtros (Ya entraron / En recibo / En tránsito / Sin comprar). Hace el cálculo completo.
    getResumen: async (id_empresa: string) => {
        const articulos = await completoCacheado(id_empresa);
        return {
            total: articulos.length,
            piezas: articulos.reduce((s, a) => s + a.negada, 0),
            resumen: resumenDe(articulos),
            generado: new Date().toISOString(),
        };
    },

    // Una página de negados. Sin filtro ("todos") solo se calcula la página pedida, así la primera sale rápido;
    // con filtro hace falta el cálculo completo (el estado depende de lo que entró/viene), que queda en caché unos segundos.
    getPagina: async (id_empresa: string, opts: { page: number; limite: number; filtro: FiltroNegados }) => {
        const { limite, filtro } = opts;

        if (filtro === 'todos') {
            const base = `
                FROM detalle_pedido_negado n
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
                JOIN articulo a ON a.id_artic = dpa.id_articulo
                WHERE ${NEGADOS_VIGENTES}`;
            const [tot] = await dbLocal.query<any>(`
                SELECT COUNT(*) AS total, COALESCE(SUM(negada), 0) AS piezas
                FROM (SELECT dpa.id_articulo, SUM(n.cantidad_negada) AS negada ${base} GROUP BY dpa.id_articulo) t
            `, { type: QueryTypes.SELECT }) as any[];
            const total = num(tot?.total);
            const totalPaginas = Math.max(1, Math.ceil(total / limite));
            const page = Math.min(Math.max(1, opts.page), totalPaginas);

            const idsFilas = await dbLocal.query<any>(`
                SELECT dpa.id_articulo AS id
                ${base}
                GROUP BY dpa.id_articulo, a.des_artic
                ORDER BY MIN(n.fecha) ASC, a.des_artic ASC
                LIMIT :limite OFFSET :offset
            `, { replacements: { limite, offset: (page - 1) * limite }, type: QueryTypes.SELECT }) as any[];
            const ids = idsFilas.map(r => String(r.id));
            const articulos = ids.length ? await consultar(id_empresa, ids) : [];

            return {
                total, piezas: num(tot?.piezas), filtro, total_filtrado: total,
                articulos, page, limite, total_paginas: totalPaginas,
                generado: new Date().toISOString(),
            };
        }

        const todos = await completoCacheado(id_empresa);
        const estados = ESTADOS_POR_FILTRO[filtro];
        const filtrados = todos.filter(a => estados.includes(a.estado));
        const totalPaginas = Math.max(1, Math.ceil(filtrados.length / limite));
        const page = Math.min(Math.max(1, opts.page), totalPaginas);
        return {
            total: todos.length,
            piezas: todos.reduce((s, a) => s + a.negada, 0),
            filtro,
            total_filtrado: filtrados.length,
            articulos: filtrados.slice((page - 1) * limite, page * limite),
            page, limite, total_paginas: totalPaginas,
            generado: new Date().toISOString(),
        };
    },
};
