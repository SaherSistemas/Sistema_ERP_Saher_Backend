import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Tablero para los encargados de almacén: cuánto hay en existencia en la empresa y el estado general.
// Todo es de solo lectura sobre stock_ubicacion_lote (la existencia real por ubicación y lote).
export const TableroAlmacenService = {

    getResumen: async (id_empresa: string) => {
        const rep = { emp: id_empresa };
        // lista: varias filas · una: una sola fila (objeto vacío si no hay)
        const lista = (sql: string) => dbLocal.query<any>(sql, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>;
        const una = async (sql: string): Promise<any> => (await lista(sql))[0] ?? {};

        const [
            stock, valor, catalogo, caducidad, proximosCaducar, topArticulos, porStatus, facturadosHoy, vencidos, negados,
        ] = await Promise.all([
            una(`
                SELECT COALESCE(SUM(s.cantidad), 0)                                         AS existencia,
                       COALESCE(SUM(s.cantidad_apartada), 0)                                AS apartada,
                       COUNT(DISTINCT s.id_articulo) FILTER (WHERE s.cantidad > 0)           AS articulos_con_existencia,
                       COUNT(DISTINCT s.id_lote) FILTER (WHERE s.cantidad > 0)               AS lotes_con_existencia,
                       COUNT(DISTINCT s.id_ubicacion_sucursal) FILTER (WHERE s.cantidad > 0) AS ubicaciones_ocupadas
                FROM stock_ubicacion_lote s
                WHERE s.id_empresa_sucursal = :emp
            `),
            // Valor al costo capturado en cada lote (puede haber lotes sin costo: se avisan aparte)
            una(`
                SELECT COALESCE(SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)), 0) AS valor,
                       COUNT(DISTINCT s.id_lote) FILTER (WHERE COALESCE(l.precio_costo_lote_sucursal, 0) = 0) AS lotes_sin_costo
                FROM stock_ubicacion_lote s
                LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
            `),
            una(`SELECT COUNT(*) AS total FROM articulo WHERE cod_int_artic IS NOT NULL`),
            una(`
                SELECT
                    COALESCE(SUM(s.cantidad) FILTER (WHERE l.fecha_venci_lote_sucursal < CURRENT_DATE), 0) AS pzs_caducadas,
                    COUNT(DISTINCT s.id_lote) FILTER (WHERE l.fecha_venci_lote_sucursal < CURRENT_DATE) AS lotes_caducados,
                    COALESCE(SUM(s.cantidad) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE
                                                       AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 30), 0) AS pzs_30,
                    COUNT(DISTINCT s.id_lote) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE
                                                        AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 30) AS lotes_30,
                    COALESCE(SUM(s.cantidad) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE + 30
                                                       AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 90), 0) AS pzs_90,
                    COUNT(DISTINCT s.id_lote) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE + 30
                                                        AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 90) AS lotes_90,
                    COALESCE(SUM(s.cantidad) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE + 90
                                                       AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 180), 0) AS pzs_180,
                    COUNT(DISTINCT s.id_lote) FILTER (WHERE l.fecha_venci_lote_sucursal >= CURRENT_DATE + 90
                                                        AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 180) AS lotes_180
                FROM stock_ubicacion_lote s
                JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
            `),
            lista(`
                SELECT a.cod_int_artic, a.des_artic, l.numero_lote_sucursal AS lote,
                       l.fecha_venci_lote_sucursal AS caducidad, SUM(s.cantidad) AS cantidad
                FROM stock_ubicacion_lote s
                JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                JOIN articulo a ON a.id_artic = s.id_articulo
                WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
                  AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 180
                GROUP BY a.cod_int_artic, a.des_artic, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
                ORDER BY l.fecha_venci_lote_sucursal ASC, a.des_artic ASC
                LIMIT 15
            `),
            lista(`
                SELECT a.cod_int_artic, a.des_artic, SUM(s.cantidad) AS existencia, SUM(s.cantidad_apartada) AS apartada
                FROM stock_ubicacion_lote s
                JOIN articulo a ON a.id_artic = s.id_articulo
                WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
                GROUP BY a.cod_int_artic, a.des_artic
                ORDER BY SUM(s.cantidad) DESC
                LIMIT 10
            `),
            // Pedidos en proceso (la tabla de pedidos no guarda empresa: es la operación del almacén)
            lista(`
                SELECT status_pedido_alm AS status, COUNT(*) AS total
                FROM pedido_almacen
                WHERE status_pedido_alm IN ('CA', 'SU', 'CH', 'EM')
                GROUP BY status_pedido_alm
            `),
            una(`SELECT COUNT(*) AS total FROM pedido_almacen WHERE fecha_facturado_pedido_alm::date = CURRENT_DATE`),
            una(`
                SELECT COUNT(*) AS total FROM pedido_almacen
                WHERE status_pedido_alm IN ('CA', 'SU', 'CH') AND fecha_max_entrega_alm IS NOT NULL AND fecha_max_entrega_alm < NOW()
            `),
            // Negados que siguen vigentes para Compras (mismos criterios que la lista de Negados de Nueva Compra)
            una(`
                SELECT COUNT(DISTINCT dpa.id_articulo) AS articulos, COALESCE(SUM(n.cantidad_negada), 0) AS piezas
                FROM detalle_pedido_negado n
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
                WHERE n.recuperado = false AND n.fecha + INTERVAL '7 days' >= NOW()
            `),
        ]);

        const existencia = num(stock?.existencia);
        const apartada = num(stock?.apartada);
        const conExistencia = num(stock?.articulos_con_existencia);
        const totalCatalogo = num(catalogo?.total);
        const statusPedidos = Object.fromEntries((porStatus as any[]).map(r => [r.status, num(r.total)]));

        return {
            existencia: {
                total: existencia,
                apartada,
                disponible: Math.max(0, existencia - apartada),
                valor_costo: +num(valor?.valor).toFixed(2),
                lotes_sin_costo: num(valor?.lotes_sin_costo),
            },
            articulos: {
                con_existencia: conExistencia,
                en_catalogo: totalCatalogo,
                sin_existencia: Math.max(0, totalCatalogo - conExistencia),
            },
            almacen: {
                lotes_con_existencia: num(stock?.lotes_con_existencia),
                ubicaciones_ocupadas: num(stock?.ubicaciones_ocupadas),
            },
            caducidad: {
                caducadas: { piezas: num(caducidad?.pzs_caducadas), lotes: num(caducidad?.lotes_caducados) },
                en_30_dias: { piezas: num(caducidad?.pzs_30), lotes: num(caducidad?.lotes_30) },
                en_90_dias: { piezas: num(caducidad?.pzs_90), lotes: num(caducidad?.lotes_90) },
                en_180_dias: { piezas: num(caducidad?.pzs_180), lotes: num(caducidad?.lotes_180) },
            },
            pedidos: {
                en_fila: statusPedidos.CA ?? 0,
                surtiendo: statusPedidos.SU ?? 0,
                por_checar: statusPedidos.CH ?? 0,
                empacados: statusPedidos.EM ?? 0,
                facturados_hoy: num(facturadosHoy?.total),
                con_entrega_vencida: num(vencidos?.total),
            },
            negados_vigentes: { articulos: num(negados?.articulos), piezas: num(negados?.piezas) },
            proximos_a_caducar: (proximosCaducar as any[]).map(r => ({
                cod_int_artic: r.cod_int_artic, des_artic: r.des_artic, lote: r.lote,
                caducidad: r.caducidad, cantidad: num(r.cantidad),
            })),
            top_articulos: (topArticulos as any[]).map(r => ({
                cod_int_artic: r.cod_int_artic, des_artic: r.des_artic,
                existencia: num(r.existencia), apartada: num(r.apartada),
            })),
            generado: new Date().toISOString(),
        };
    },
};
