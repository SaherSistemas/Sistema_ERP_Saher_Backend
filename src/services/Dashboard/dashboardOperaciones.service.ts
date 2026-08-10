import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../config/db';

export interface IDiasInventario {
    id_articulo: string;
    descripcion_articulo: string;
    stock: number;
    piezas_por_dia: number;
    dias_inventario: number | null;
    costo_stock: number;
}

export interface IPresupuestoAgente {
    id_presupuesto_agente: string;
    nombre_agente: string;
    monto_asignado: number;
    vendido: number;
    pct: number;
    llego_meta: boolean;
    mes: number;
    anio: number;
}

export const dashboardOperacionesService = {

    getKpis: async () => {
        const hoy = new Date().toISOString().slice(0, 10);
        const inicioMes = new Date();
        inicioMes.setDate(1);
        const inicioMesStr = inicioMes.toISOString().slice(0, 10);

        const [compras, almacen] = await Promise.all([

            // ── Compras ───────────────────────────────────────────────────────────
            dbLocal.query<any>(`
                SELECT
                    COUNT(*) FILTER (WHERE cp.estado_comp = 'A')                         AS por_llegar,
                    COALESCE(SUM(cp.total_comp_factura) FILTER (WHERE cp.estado_comp = 'A'), 0) AS monto_por_llegar,
                    COUNT(*) FILTER (WHERE cp.estado_comp = 'D')                         AS devoluciones,
                    COUNT(*) FILTER (WHERE cp.estado_comp = 'R'
                        AND cp.fin_de_compra_proveedor::date >= :inicio_mes)             AS recibidas_mes,
                    COALESCE(SUM(cp.total_comp_recibido) FILTER (WHERE cp.estado_comp = 'R'
                        AND cp.fin_de_compra_proveedor::date >= :inicio_mes), 0)         AS monto_recibido_mes,
                    COUNT(*) FILTER (WHERE cp.estado_comp = 'F')                         AS facturadas_pendientes,
                    COUNT(DISTINCT cp.idprove_comp) FILTER (WHERE cp.estado_comp = 'A')  AS proveedores_pendientes
                FROM compra_proveedor cp
            `, { replacements: { inicio_mes: inicioMesStr }, type: QueryTypes.SELECT }),

            // ── Almacén / Pedidos ─────────────────────────────────────────────────
            dbLocal.query<any>(`
                SELECT
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'CA')  AS capturados,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'SU')  AS surtiendo,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'CH')  AS en_chequeo,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'EM')  AS en_empaque,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm NOT IN ('FA','EN','EC','CO')
                        AND pa.fecha_max_entrega_alm IS NOT NULL
                        AND pa.fecha_max_entrega_alm::date < :hoy)       AS retrasados,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'EN'
                        AND pa.fecha_entrega_al_cliente::date = :hoy)    AS entregados_hoy,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm = 'EN'
                        AND pa.fecha_entrega_al_cliente::date >= :inicio_mes) AS entregados_mes,
                    ROUND(
                        AVG(
                            EXTRACT(EPOCH FROM (pa.fecha_entrega_alm - pa.inicio_surtido)) / 3600.0
                        ) FILTER (WHERE pa.status_pedido_alm IN ('FA','EN')
                            AND pa.inicio_surtido IS NOT NULL
                            AND pa.fecha_entrega_alm IS NOT NULL
                            AND pa.fecha_entrega_alm::date >= :inicio_mes)
                    , 1)                                                   AS tiempo_prom_surtido_hrs,
                    COUNT(*) FILTER (WHERE pa.status_pedido_alm NOT IN ('FA','EN','EC','CO')) AS activos_total
                FROM pedido_almacen pa
            `, { replacements: { hoy, inicio_mes: inicioMesStr }, type: QueryTypes.SELECT }),
        ]);

        const c = compras[0] ?? {};
        const a = almacen[0] ?? {};

        return {
            compras: {
                por_llegar:             Number(c.por_llegar            ?? 0),
                monto_por_llegar:       Number(c.monto_por_llegar      ?? 0),
                devoluciones:           Number(c.devoluciones          ?? 0),
                recibidas_mes:          Number(c.recibidas_mes         ?? 0),
                monto_recibido_mes:     Number(c.monto_recibido_mes    ?? 0),
                facturadas_pendientes:  Number(c.facturadas_pendientes  ?? 0),
                proveedores_pendientes: Number(c.proveedores_pendientes ?? 0),
            },
            almacen: {
                capturados:              Number(a.capturados              ?? 0),
                surtiendo:               Number(a.surtiendo               ?? 0),
                en_chequeo:              Number(a.en_chequeo              ?? 0),
                en_empaque:              Number(a.en_empaque              ?? 0),
                retrasados:              Number(a.retrasados              ?? 0),
                entregados_hoy:          Number(a.entregados_hoy          ?? 0),
                entregados_mes:          Number(a.entregados_mes          ?? 0),
                activos_total:           Number(a.activos_total           ?? 0),
                tiempo_prom_surtido_hrs: a.tiempo_prom_surtido_hrs != null
                    ? Number(a.tiempo_prom_surtido_hrs) : null,
            },
        };
    },

    // ── Días de inventario por artículo ──────────────────────────────────────
    getDiasInventario: async (limite = 30): Promise<IDiasInventario[]> => {
        const rows = await dbLocal.query<any>(`
            WITH ventas_90d AS (
                SELECT
                    df.id_articulo,
                    SUM(df.cantidad_facturada)::float / 90.0 AS piezas_por_dia
                FROM detalle_factura df
                JOIN facturas f ON f.id_factura = df.id_factura
                WHERE f.tipo_cfdi       = 'I'
                  AND f.estatus_factura != 'CAN'
                  AND f.fecha_emision   >= NOW() - INTERVAL '90 days'
                GROUP BY df.id_articulo
            ),
            stock_actual AS (
                SELECT
                    id_articulo,
                    SUM(cantidad - cantidad_apartada) AS stock_disponible
                FROM stock_ubicacion_lote
                GROUP BY id_articulo
            )
            SELECT
                sa.id_articulo,
                a.des_artic                                              AS descripcion_articulo,
                sa.stock_disponible::int                                 AS stock,
                ROUND(v.piezas_por_dia::numeric, 2)                     AS piezas_por_dia,
                ROUND((sa.stock_disponible / NULLIF(v.piezas_por_dia, 0))::numeric, 0)
                                                                         AS dias_inventario,
                ROUND((sa.stock_disponible * COALESCE(
                    (SELECT l.precio_costo_lote_sucursal
                     FROM lote_articulo_sucursal l
                     WHERE l.id_artic = sa.id_articulo AND l.estado_lote_sucursal = 'A'
                     ORDER BY l.fecha_venci_lote_sucursal ASC LIMIT 1), 0
                ))::numeric, 2)                                          AS costo_stock
            FROM stock_actual sa
            JOIN ventas_90d v ON v.id_articulo = sa.id_articulo
            JOIN articulo   a ON a.id_artic    = sa.id_articulo
            WHERE sa.stock_disponible > 0
              AND v.piezas_por_dia    > 0
            ORDER BY dias_inventario ASC
            LIMIT :limite
        `, { replacements: { limite }, type: QueryTypes.SELECT });

        return rows.map(r => ({
            id_articulo:          r.id_articulo,
            descripcion_articulo: r.descripcion_articulo,
            stock:                Number(r.stock),
            piezas_por_dia:       Number(r.piezas_por_dia),
            dias_inventario:      r.dias_inventario != null ? Number(r.dias_inventario) : null,
            costo_stock:          Number(r.costo_stock ?? 0),
        }));
    },

    // ── Presupuestos de agentes (mes actual) ──────────────────────────────────
    getPresupuestosAgentes: async (): Promise<IPresupuestoAgente[]> => {
        const now = new Date();
        const mes  = now.getMonth() + 1;
        const anio = now.getFullYear();

        const rows = await dbLocal.query<any>(`
            SELECT
                pa.id_presupuesto_agente,
                pa.monto_asignado,
                pa.mes,
                pa.anio,
                pa.llego_meta,
                CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado) AS nombre_agente,
                COALESCE((
                    SELECT SUM(f.total_factura)
                    FROM facturas f
                    JOIN pedido_almacen p ON p.id_pedido_alm = f.id_pedido_alm
                    WHERE p.id_agente_pedido_alm = av.id_agente
                      AND f.tipo_cfdi       = 'I'
                      AND f.estatus_factura != 'CAN'
                      AND EXTRACT(YEAR  FROM f.fecha_emision) = pa.anio
                      AND EXTRACT(MONTH FROM f.fecha_emision) = pa.mes
                ), 0) AS vendido
            FROM presupuesto_agente pa
            JOIN agente_de_venta av ON av.id_agente  = pa.id_agente
            JOIN empleado        e  ON e.id_empleado = av.id_empleado
            WHERE pa.estatus = 'ABIERTO'
              AND pa.mes  = :mes
              AND pa.anio = :anio
            ORDER BY nombre_agente
        `, { replacements: { mes, anio }, type: QueryTypes.SELECT });

        return rows.map(r => {
            const vendido  = Number(r.vendido      ?? 0);
            const asignado = Number(r.monto_asignado ?? 0);
            return {
                id_presupuesto_agente: r.id_presupuesto_agente,
                nombre_agente:         r.nombre_agente,
                monto_asignado:        asignado,
                vendido,
                pct:      asignado > 0 ? Math.round((vendido / asignado) * 100) : 0,
                llego_meta: Boolean(r.llego_meta),
                mes:  Number(r.mes),
                anio: Number(r.anio),
            };
        });
    },
};
