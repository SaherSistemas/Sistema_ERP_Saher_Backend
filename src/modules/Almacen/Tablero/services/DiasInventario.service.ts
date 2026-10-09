import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

export type Semaforo = 'AGOTADO' | 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';
export type Confianza = 'alta' | 'media' | 'baja';
// Dónde va la compra de ese artículo (mismos criterios que Negados vigentes / Compras):
//  · En recibo    → ya llegó y está capturado en una factura de proveedor, falta checarla.
//  · En tránsito  → orden de compra en tránsito (estados C, A, E, L, K), con el proveedor.
//  · Sin comprar  → nada de lo anterior.
export type EstadoCompra = 'EN_RECIBO' | 'EN_CAMINO' | 'SIN_COMPRAR';
// Filtro de la lista: sin = ni tránsito ni recibo · camino = tiene algo en tránsito · recibo = tiene algo en recibo
export type FiltroCompra = 'sin' | 'camino' | 'recibo';

// Días de inventario por artículo: cuántos días alcanza lo que hay disponible al ritmo real de salida.
//
// Para que sea lo más confiable posible:
//  · La salida real sale del Kardex de ESTA empresa (VENTA = lo que se facturó/trasladó/entregó desde el
//    almacén), menos las devoluciones de clientes que regresaron al almacén.
//  · El ritmo (pz/día) se divide entre los días que de verdad hay datos: si el artículo (o el propio
//    Kardex) es más joven que la ventana, se usa su edad — no se diluye entre 90 días que no existieron.
//    Mínimo 7 días para no inflar el ritmo con un solo pedido.
//  · El stock es lo DISPONIBLE (existencia menos lo apartado en pedidos), solo de esta empresa.
//  · Cada artículo trae su confianza según en cuántos días distintos tuvo ventas: un pedido grande único
//    no es una demanda constante, y se marca "baja".
//  · Los agotados solo se listan si su demanda es constante (confianza alta/media).
export const DiasInventarioService = {

    getLista: async (id_empresa: string, dias: number, limite: number, page = 1, conCompra = true, filtroCompra?: FiltroCompra) => {
        const filas = await dbLocal.query<any>(`
            WITH base AS (
                SELECT GREATEST(7, LEAST(:dias, COALESCE(CEIL(EXTRACT(EPOCH FROM (NOW() - MIN(fecha))) / 86400), :dias)))::int AS ventana_global
                FROM kardex_movimientos_articulos
                WHERE id_empresa = :emp AND tipo_movimiento = 'VENTA'
            ),
            mov AS (
                SELECT k.id_articulo,
                       SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento ELSE 0 END) AS vendidas,
                       SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' THEN k.cantidad_movimiento ELSE 0 END) AS devueltas,
                       COUNT(DISTINCT k.fecha::date) FILTER (WHERE k.tipo_movimiento = 'VENTA') AS dias_con_venta
                FROM kardex_movimientos_articulos k
                WHERE k.id_empresa = :emp
                  AND k.fecha >= NOW() - (:dias * INTERVAL '1 day')
                  AND (k.tipo_movimiento = 'VENTA'
                       OR (k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%'))
                GROUP BY k.id_articulo
            ),
            primera AS (
                SELECT id_articulo, MIN(fecha) AS primera
                FROM kardex_movimientos_articulos
                WHERE id_empresa = :emp
                GROUP BY id_articulo
            ),
            stock AS (
                SELECT id_articulo, SUM(cantidad) AS existencia, SUM(COALESCE(cantidad_apartada, 0)) AS apartada
                FROM stock_ubicacion_lote
                WHERE id_empresa_sucursal = :emp
                GROUP BY id_articulo
            )
            SELECT a.id_artic, a.cod_int_artic, a.des_artic,
                   m.vendidas, m.devueltas, m.dias_con_venta,
                   COALESCE(s.existencia, 0) AS existencia,
                   COALESCE(s.apartada, 0)   AS apartada,
                   GREATEST(7, LEAST((SELECT ventana_global FROM base),
                                     COALESCE(CEIL(EXTRACT(EPOCH FROM (NOW() - p.primera)) / 86400), :dias)))::int AS ventana
            FROM mov m
            JOIN articulo a ON a.id_artic = m.id_articulo
            LEFT JOIN stock s ON s.id_articulo = m.id_articulo
            LEFT JOIN primera p ON p.id_articulo = m.id_articulo
            WHERE m.vendidas - m.devueltas > 0
        `, { replacements: { emp: id_empresa, dias }, type: QueryTypes.SELECT }) as any[];

        // Umbrales de confianza proporcionales a la ventana (90 d: 13 y 5 días con venta · 30 d: 5 y 2 · 7 d: 3 y 2)
        const minAlta = Math.max(3, Math.round(dias * 0.15));
        const minMedia = Math.max(2, Math.round(dias * 0.05));

        const articulos = filas.map(r => {
            const neta = num(r.vendidas) - num(r.devueltas);
            const ventana = Math.max(1, num(r.ventana));
            const pzDia = neta / ventana;
            const disponible = Math.max(0, num(r.existencia) - num(r.apartada));
            const diasInv = pzDia > 0 ? disponible / pzDia : null;
            const diasConVenta = num(r.dias_con_venta);
            const confianza: Confianza = diasConVenta >= minAlta ? 'alta' : diasConVenta >= minMedia ? 'media' : 'baja';
            const semaforo: Semaforo =
                disponible <= 0 ? 'AGOTADO'
                    : diasInv! <= 7 ? 'CRITICO'
                        : diasInv! <= 15 ? 'BAJO'
                            : diasInv! <= 45 ? 'NORMAL' : 'ALTO';
            return {
                id_artic: r.id_artic as string,
                cod_int_artic: r.cod_int_artic as number,
                des_artic: r.des_artic as string,
                disponible,
                existencia: num(r.existencia),
                vendidas: neta,
                ventana_dias: ventana,
                pz_dia: +pzDia.toFixed(2),
                dias_inventario: diasInv === null ? null : Math.round(diasInv),
                dias_con_venta: diasConVenta,
                confianza,
                semaforo,
            };
        });

        // Solo los que importan: agotados con demanda constante, críticos y bajos
        const criticos = articulos
            .filter(a => (a.semaforo === 'AGOTADO' && a.confianza !== 'baja') || a.semaforo === 'CRITICO' || a.semaforo === 'BAJO')
            .sort((a, b) =>
                (a.dias_inventario ?? 0) - (b.dias_inventario ?? 0) || b.pz_dia - a.pz_dia);

        // Tránsito y recibo de TODA la lista: sirve para filtrar por "sin comprar" y para los conteos de cada filtro
        const ids = conCompra ? criticos.map(a => a.id_artic) : [];
        const [camino, recibo] = ids.length
            ? await Promise.all([
                dbLocal.query<any>(`
                    SELECT d.idarticulo_detcompsol AS id_articulo, SUM(d.cantidad_detcompsol) AS cant,
                           STRING_AGG(DISTINCT regexp_replace(TRIM(pr.nomcort_prove), '[,\\s]+$', ''), ', ') AS proveedores
                    FROM detalle_compra_solicitado d
                    JOIN compra_proveedor c ON c.id_comp = d.idcompr_detcompsol
                    LEFT JOIN proveedor pr ON pr.id_prove = c.idprove_comp
                    WHERE c.estado_comp IN ('C', 'A', 'E', 'L', 'K') AND d.idarticulo_detcompsol IN (:ids)
                    GROUP BY d.idarticulo_detcompsol
                `, { replacements: { ids }, type: QueryTypes.SELECT }) as Promise<any[]>,
                dbLocal.query<any>(`
                    SELECT dfcp.id_artic AS id_articulo, SUM(dfcp.cantidad_articulo_facturada) AS cant
                    FROM detalle_factura_compra_proveedor dfcp
                    JOIN factura_compra_proveedor fcp ON fcp.id_factura_proveedor = dfcp.id_factura_compra_proveedor
                    WHERE dfcp.checado IS NOT TRUE AND fcp.estado_factura_proveedor NOT IN ('H', 'D')
                      AND dfcp.id_artic IN (:ids)
                    GROUP BY dfcp.id_artic
                `, { replacements: { ids }, type: QueryTypes.SELECT }) as Promise<any[]>,
            ])
            : [[], []];
        const caminoPorArt = new Map<string, any>(camino.map(r => [String(r.id_articulo), r]));
        const reciboPorArt = new Map<string, any>(recibo.map(r => [String(r.id_articulo), r]));

        const conCompraInfo = criticos.map(a => {
            const enCamino = num(caminoPorArt.get(a.id_artic)?.cant);
            const enRecibo = num(reciboPorArt.get(a.id_artic)?.cant);
            const compra: EstadoCompra = enRecibo > 0 ? 'EN_RECIBO' : enCamino > 0 ? 'EN_CAMINO' : 'SIN_COMPRAR';
            return {
                ...a,
                en_recibo: enRecibo,
                en_camino: enCamino,
                en_camino_proveedores: String(caminoPorArt.get(a.id_artic)?.proveedores ?? ''),
                compra,
            };
        });

        const resumenCompra = {
            sin_comprar: conCompraInfo.filter(a => a.en_recibo === 0 && a.en_camino === 0).length,
            en_camino: conCompraInfo.filter(a => a.en_camino > 0).length,
            en_recibo: conCompraInfo.filter(a => a.en_recibo > 0).length,
        };

        // Filtro: sin compra (ni tránsito ni recibo), con algo en tránsito o con algo en recibo
        const lista = filtroCompra === 'sin' ? conCompraInfo.filter(a => a.en_recibo === 0 && a.en_camino === 0)
            : filtroCompra === 'camino' ? conCompraInfo.filter(a => a.en_camino > 0)
                : filtroCompra === 'recibo' ? conCompraInfo.filter(a => a.en_recibo > 0)
                    : conCompraInfo;

        const totalPaginas = Math.max(1, Math.ceil(lista.length / limite));
        const paginaActual = Math.min(Math.max(1, page), totalPaginas);

        return {
            dias,
            analizados: articulos.length,
            resumen: {
                agotados: criticos.filter(a => a.semaforo === 'AGOTADO').length,
                criticos: criticos.filter(a => a.semaforo === 'CRITICO').length,
                bajos: criticos.filter(a => a.semaforo === 'BAJO').length,
            },
            resumen_compra: resumenCompra,
            filtro_compra: filtroCompra ?? null,
            articulos: lista.slice((paginaActual - 1) * limite, paginaActual * limite),
            total_listados: lista.length,
            page: paginaActual,
            limite,
            total_paginas: totalPaginas,
            generado: new Date().toISOString(),
        };
    },

    // Ids de TODOS los artículos de la lista (agotados con demanda constante, críticos y bajos) para la ventana de `dias`.
    // Es la lista que usa la compra especial hecha desde el Tablero de Almacén.
    getIdsEnRiesgo: async (id_empresa: string, dias: number): Promise<string[]> => {
        const { articulos } = await DiasInventarioService.getLista(id_empresa, dias, 1_000_000, 1, false);
        return articulos.map(a => a.id_artic);
    },
};
