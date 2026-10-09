import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

export type RangoDias = 'sin_venta' | 'hasta_15' | 'de_16_a_45' | 'de_46_a_90' | 'de_91_a_180' | 'mas_180';
export const RANGOS_DIAS: RangoDias[] = ['sin_venta', 'hasta_15', 'de_16_a_45', 'de_46_a_90', 'de_91_a_180', 'mas_180'];

// Detalle de la tarjeta "Días de inventario" del Tablero.
// Por artículo: días = existencia ÷ piezas vendidas en los últimos 30 días × 30.
// Venta = salidas por venta del Kardex de la empresa menos las devoluciones de clientes que regresaron al almacén.
// Solo entran los artículos con existencia; los que no se vendieron en el mes quedan en "sin venta" (sin días).
export const DiasInventarioDetalleService = {

    getDetalle: async (id_empresa: string, opts: { rango: RangoDias | null; q: string; page: number; limite: number }) => {
        const { rango, q, page, limite } = opts;
        const busqueda = q.trim();
        const rep: Record<string, any> = { emp: id_empresa, limite, offset: (page - 1) * limite };
        let filtroBusqueda = '';
        if (busqueda) {
            rep.like = `%${busqueda}%`;
            filtroBusqueda = `AND (des_artic ILIKE :like OR cod_barr_artic ILIKE :like ${/^\d+$/.test(busqueda) ? 'OR cod_int_artic = :cod' : ''})`;
            if (/^\d+$/.test(busqueda)) rep.cod = Number(busqueda);
        }
        if (rango) rep.rango = rango;

        const base = `
            WITH stock AS (
                SELECT s.id_articulo, SUM(s.cantidad) AS existencia, SUM(COALESCE(s.cantidad_apartada, 0)) AS apartada,
                       SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)) AS valor
                FROM stock_ubicacion_lote s
                LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                WHERE s.id_empresa_sucursal = :emp
                GROUP BY s.id_articulo
                HAVING SUM(s.cantidad) > 0
            ),
            ventas AS (
                SELECT id_articulo,
                       SUM(CASE WHEN tipo_movimiento = 'VENTA' THEN cantidad_movimiento ELSE 0 END)
                     - SUM(CASE WHEN tipo_movimiento = 'ENTRADA' THEN cantidad_movimiento ELSE 0 END) AS vendidas
                FROM kardex_movimientos_articulos
                WHERE id_empresa = :emp AND fecha >= NOW() - INTERVAL '30 days'
                  AND (tipo_movimiento = 'VENTA' OR (tipo_movimiento = 'ENTRADA' AND notas ILIKE 'Devolución recibida%'))
                GROUP BY id_articulo
            ),
            art AS (
                SELECT a.cod_int_artic, a.des_artic, COALESCE(a.cod_barr_artic, '') AS cod_barr_artic,
                       st.existencia, st.apartada, st.valor,
                       GREATEST(COALESCE(v.vendidas, 0), 0) AS vendidas,
                       CASE WHEN COALESCE(v.vendidas, 0) > 0 THEN st.existencia / v.vendidas * 30 END AS dias
                FROM stock st
                JOIN articulo a ON a.id_artic = st.id_articulo
                LEFT JOIN ventas v ON v.id_articulo = st.id_articulo
            ),
            clas AS (
                SELECT *,
                       CASE WHEN dias IS NULL THEN 'sin_venta'
                            WHEN dias <= 15  THEN 'hasta_15'
                            WHEN dias <= 45  THEN 'de_16_a_45'
                            WHEN dias <= 90  THEN 'de_46_a_90'
                            WHEN dias <= 180 THEN 'de_91_a_180'
                            ELSE 'mas_180' END AS rango
                FROM art
            )`;

        const [resumenRangos, [globales], filas, [conteo]] = await Promise.all([
            dbLocal.query<any>(`${base}
                SELECT rango, COUNT(*) AS articulos, SUM(existencia) AS piezas, SUM(valor) AS valor
                FROM clas GROUP BY rango`, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            // Mismos números que la tarjeta: existencia de la empresa y venta neta del mes de TODOS los artículos
            dbLocal.query<any>(`${base}
                SELECT (SELECT COALESCE(SUM(existencia), 0) FROM stock) AS existencia,
                       (SELECT COALESCE(SUM(apartada), 0) FROM stock) AS apartada,
                       (SELECT COALESCE(SUM(valor), 0) FROM stock) AS valor,
                       (SELECT COALESCE(SUM(GREATEST(vendidas, 0)), 0) FROM ventas) AS vendidas`,
                { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            dbLocal.query<any>(`${base}
                SELECT cod_int_artic, des_artic, cod_barr_artic, existencia, apartada, valor, vendidas, dias, rango
                FROM clas
                WHERE TRUE ${rango ? 'AND rango = :rango' : ''} ${filtroBusqueda}
                ORDER BY dias DESC NULLS FIRST, existencia DESC, des_artic ASC
                LIMIT :limite OFFSET :offset`, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            dbLocal.query<any>(`${base}
                SELECT COUNT(*) AS total FROM clas
                WHERE TRUE ${rango ? 'AND rango = :rango' : ''} ${filtroBusqueda}`, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
        ]);

        const existencia = num(globales?.existencia);
        const vendidas30 = num(globales?.vendidas);
        const porRango = Object.fromEntries(resumenRangos.map(r => [r.rango, r]));
        const total = num(conteo?.total);

        return {
            resumen: {
                existencia,
                apartada: num(globales?.apartada),
                valor_existencia: +num(globales?.valor).toFixed(2),
                vendidas_30d: vendidas30,
                pz_dia: +(vendidas30 / 30).toFixed(1),
                dias: vendidas30 > 0 ? Math.round((existencia / vendidas30) * 30) : null,
            },
            rangos: RANGOS_DIAS.map(r => ({
                rango: r,
                articulos: num(porRango[r]?.articulos),
                piezas: num(porRango[r]?.piezas),
                valor: +num(porRango[r]?.valor).toFixed(2),
            })),
            page,
            limite,
            total_articulos: total,
            total_paginas: Math.max(1, Math.ceil(total / limite)),
            articulos: filas.map(r => ({
                cod_int_artic: r.cod_int_artic as number,
                des_artic: r.des_artic as string,
                cod_barr_artic: r.cod_barr_artic as string,
                existencia: num(r.existencia),
                apartada: num(r.apartada),
                vendidas_30d: num(r.vendidas),
                pz_dia: +(num(r.vendidas) / 30).toFixed(2),
                dias: r.dias === null || r.dias === undefined ? null : Math.round(num(r.dias)),
                valor: +num(r.valor).toFixed(2),
                rango: r.rango as RangoDias,
            })),
            generado: new Date().toISOString(),
        };
    },
};
