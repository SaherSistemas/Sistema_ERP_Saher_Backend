import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

// Vista única de TODOS los negados, de los dos lados:
//  · PROVEEDOR → lo que el proveedor nos negó / no entregó (detalle_compra_negados)
//  · CLIENTE   → lo que nosotros le negamos a un cliente por no surtirlo (detalle_pedido_negado)
// Solo lee: marcar como recuperado sigue haciéndose desde Nueva Compra, igual que antes.

export type OrigenNegado = 'todos' | 'proveedor' | 'cliente';
export type EstadoNegadoFiltro = 'pendientes' | 'recuperados' | 'todos';

export interface FiltrosNegados {
    origen: OrigenNegado;
    estado: EstadoNegadoFiltro;
    desde?: string;   // YYYY-MM-DD
    hasta?: string;   // YYYY-MM-DD (incluye todo ese día)
    busqueda?: string;
}

const LIMITE_FILAS = 2000;
const num = (v: unknown) => Number(v ?? 0) || 0;

const MOTIVOS_CLIENTE: Record<string, string> = {
    SIN_EXISTENCIA: 'Sin existencia',
    NO_ENCONTRADO: 'No encontrado en ubicación',
    INSUFICIENTE: 'Cantidad insuficiente en físico',
    DAÑADO: 'Artículo dañado',
    CADUCADO: 'Caducado / próximo a vencer',
    DIFERENCIA_CHEQUEO: 'Diferencia en chequeo',
    NO_SURTIDO: 'No se surtió completo',
};

export const NegadosGlobalesService = {

    listar: async (f: FiltrosNegados) => {
        const replacements: Record<string, any> = {};

        // Filtros que se repiten en ambos lados; cada uno recibe las expresiones propias de su tabla
        const filtros = (c: { recuperado: string; fecha: string; textos: string[] }) => {
            const w: string[] = [];
            if (f.estado === 'pendientes') w.push(`COALESCE(${c.recuperado}, false) = false`);
            if (f.estado === 'recuperados') w.push(`COALESCE(${c.recuperado}, false) = true`);
            if (f.desde) { w.push(`${c.fecha} >= CAST(:desde AS date)`); replacements.desde = f.desde; }
            if (f.hasta) { w.push(`${c.fecha} < CAST(:hasta AS date) + 1`); replacements.hasta = f.hasta; }
            if (f.busqueda?.trim()) {
                w.push(`(${c.textos.map(t => `${t} ILIKE :q`).join(' OR ')})`);
                replacements.q = `%${f.busqueda.trim()}%`;
            }
            return w.length ? `WHERE ${w.join(' AND ')}` : '';
        };

        const ladoProveedor = `
            SELECT 'PROVEEDOR'::text                                         AS origen,
                   d.id_detcompneg::text                                     AS id,
                   d.fecha_negado::timestamptz                               AS fecha,
                   a.id_artic, a.cod_int_artic, a.des_artic,
                   d.cantidad_negada                                         AS cantidad,
                   d.motivo_negado                                           AS motivo,
                   regexp_replace(TRIM(COALESCE(pr.nomcort_prove, '')), '[,\\s]+$', '') AS contraparte,
                   CASE WHEN c.id_comp IS NULL THEN NULL
                        ELSE 'Orden del ' || to_char(c.inicio_de_compra_proveedor, 'DD/MM/YYYY') END AS referencia,
                   NULL::text                                                AS agente,
                   COALESCE(d.recuperado, false)                             AS recuperado,
                   d.fecha_limite_recuperacion::date                         AS fecha_limite
            FROM detalle_compra_negados d
            JOIN articulo a             ON a.id_artic = d.idarticulo_detcompneg
            LEFT JOIN compra_proveedor c ON c.id_comp = d.idcompr_detcompneg
            LEFT JOIN proveedor pr       ON pr.id_prove = c.idprove_comp
            ${filtros({
                recuperado: 'd.recuperado',
                fecha: 'd.fecha_negado',
                textos: ['a.des_artic', 'a.cod_int_artic::text', 'pr.nomcort_prove', 'd.motivo_negado'],
            })}`;

        const ladoCliente = `
            SELECT 'CLIENTE'::text                                           AS origen,
                   n.id_detalle_pedido_negado::text                          AS id,
                   n.fecha::timestamptz                                      AS fecha,
                   a.id_artic, a.cod_int_artic, a.des_artic,
                   n.cantidad_negada                                         AS cantidad,
                   n.motivo                                                  AS motivo,
                   COALESCE(NULLIF(ca.nom_corto_cliente_alm, ''), ca.razon_social_cliente_alm) AS contraparte,
                   pa.cod_int_pedido_alm                                     AS referencia,
                   NULLIF(TRIM(CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado)), '') AS agente,
                   COALESCE(n.recuperado, false)                             AS recuperado,
                   NULL::date                                                AS fecha_limite
            FROM detalle_pedido_negado n
            JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
            JOIN articulo a                 ON a.id_artic = dpa.id_articulo
            LEFT JOIN pedido_almacen pa     ON pa.id_pedido_alm = dpa.id_pedido_almacen
            LEFT JOIN cliente_almacen ca    ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            LEFT JOIN agente_de_venta av    ON av.id_agente = pa.id_agente_pedido_alm
            LEFT JOIN empleado e            ON e.id_empleado = av.id_empleado
            ${filtros({
                recuperado: 'n.recuperado',
                fecha: 'n.fecha',
                textos: ['a.des_artic', 'a.cod_int_artic::text', 'ca.nom_corto_cliente_alm', 'ca.razon_social_cliente_alm', 'pa.cod_int_pedido_alm'],
            })}`;

        const ambos = `${ladoProveedor} UNION ALL ${ladoCliente}`;
        const seleccionado = f.origen === 'proveedor' ? ladoProveedor : f.origen === 'cliente' ? ladoCliente : ambos;

        // Los conteos de las pestañas salen siempre de los dos lados (con los demás filtros aplicados)
        const resumenFilas = await dbLocal.query<any>(`
            WITH t AS (${ambos})
            SELECT origen, COUNT(*) AS registros, COALESCE(SUM(cantidad), 0) AS piezas,
                   COUNT(*) FILTER (WHERE NOT recuperado) AS pendientes
            FROM t GROUP BY origen
        `, { replacements, type: QueryTypes.SELECT }) as any[];

        const filas = await dbLocal.query<any>(`
            WITH t AS (${seleccionado})
            SELECT * FROM t ORDER BY fecha DESC, des_artic ASC LIMIT ${LIMITE_FILAS + 1}
        `, { replacements, type: QueryTypes.SELECT }) as any[];

        const lado = (o: string) => {
            const r = resumenFilas.find(x => x.origen === o);
            return { registros: num(r?.registros), piezas: num(r?.piezas), pendientes: num(r?.pendientes) };
        };

        const truncado = filas.length > LIMITE_FILAS;
        const negados = filas.slice(0, LIMITE_FILAS).map(r => ({
            origen: r.origen as 'PROVEEDOR' | 'CLIENTE',
            id: r.id as string,
            fecha: r.fecha as string,
            id_artic: r.id_artic as string,
            cod_int_artic: r.cod_int_artic as number,
            des_artic: r.des_artic as string,
            cantidad: num(r.cantidad),
            motivo: r.origen === 'CLIENTE'
                ? (MOTIVOS_CLIENTE[r.motivo as string] ?? (r.motivo ?? '') as string)
                : ((r.motivo ?? '') as string),
            contraparte: (r.contraparte ?? '') as string,
            referencia: (r.referencia ?? '') as string,
            agente: (r.agente ?? '') as string,
            recuperado: !!r.recuperado,
            fecha_limite: (r.fecha_limite ?? null) as string | null,
        }));

        return {
            resumen: { proveedor: lado('PROVEEDOR'), cliente: lado('CLIENTE') },
            negados,
            truncado,
            limite: LIMITE_FILAS,
            generado: new Date().toISOString(),
        };
    },
};
