import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { DiasInventarioService } from './DiasInventario.service';

const TZ = `'America/Mazatlan'`;
const num = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const consulta = (sql: string, rep: Record<string, unknown>): Promise<any[]> =>
    dbLocal.query(sql, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>;

/*
    ¿SON BUENAS LAS COMPRAS?

    Para cada artículo comprado en el periodo (facturas de proveedor con lotes registrados) se mira qué pasó con él:
    cuánto se ha vendido y para cuántos días le alcanza lo que hay, al ritmo real de salida de los últimos 90 días
    (el mismo criterio que "Días de inventario": Kardex VENTA menos devoluciones, existencia disponible).

      · SIN_MOVIMIENTO  no se ha vendido nada en la ventana y hay existencia → dinero parado.
      · SOBRECOMPRA     alcanza para más de 120 días.
      · VIGILAR         alcanza para 60 a 120 días.
      · ACERTADA        alcanza para 15 a 60 días: el rango sano.
      · CORTA           alcanza para menos de 15 días: se vende rápido, la compra se quedó corta.
      · AGOTADA         ya no queda disponible: se vendió todo (buena rotación; ojo con el desabasto).

    Además se compara lo comprado contra lo vendido (al costo) para saber si el inventario sube o baja, y se
    revisa lo que SÍ se vende y no se está comprando.
*/

export type ClaseCompra = 'SIN_MOVIMIENTO' | 'SOBRECOMPRA' | 'VIGILAR' | 'ACERTADA' | 'CORTA' | 'AGOTADA';

// Umbrales (en días de inventario)
const VENTANA_DIAS = 90;
const DIAS_SOBRECOMPRA = 120;
const DIAS_VIGILAR = 60;
const DIAS_CORTA = 15;

export const AnalisisComprasService = {

    analizar: async (id_empresa: string, desde: string, hasta: string) => {
        const dias_periodo = Math.max(1, Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000) + 1);

        // ── 1. Compras del periodo por artículo ──────────────────────────────────────────────────────────────
        const compras = await consulta(`
            SELECT d.id_artic AS id_articulo,
                   SUM(d.cantidad_articulo_facturada)::float AS comprado,
                   SUM(d.cantidad_articulo_facturada * d.precio_articulo_factura
                       * (1 - COALESCE(d.descuento_articulo_factura, 0) / 100.0))::float AS valor,
                   COUNT(DISTINCT f.id_factura_proveedor)::int AS facturas
            FROM detalle_factura_compra_proveedor d
            JOIN factura_compra_proveedor f ON f.id_factura_proveedor = d.id_factura_compra_proveedor
            WHERE f.tipo_origen = 'COMPRA' AND d.id_artic IS NOT NULL
              AND COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes) IS NOT NULL
              AND (COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes) AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
            GROUP BY d.id_artic
        `, { desde, hasta });

        // Fecha de la última compra de cada artículo (la más reciente que se registró, aunque sea de antes del periodo)
        const ultimas = await consulta(`
            SELECT d.id_artic AS id_articulo,
                   to_char((MAX(COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes)) AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS ultima
            FROM detalle_factura_compra_proveedor d
            JOIN factura_compra_proveedor f ON f.id_factura_proveedor = d.id_factura_compra_proveedor
            WHERE f.tipo_origen = 'COMPRA' AND d.id_artic IS NOT NULL
              AND COALESCE(f.fin_de_registro_lotes, f.inicio_de_registro_lotes) IS NOT NULL
            GROUP BY d.id_artic
        `, {});
        const ultimaCompra = new Map<string, string>(ultimas.map(u => [String(u.id_articulo), String(u.ultima)]));

        // ── 2. Ritmo de venta de los últimos 90 días y lo vendido en el periodo ─────────────────────────────────
        const ventas = await consulta(`
            WITH base AS (
                SELECT GREATEST(7, LEAST(:ventana, COALESCE(CEIL(EXTRACT(EPOCH FROM (NOW() - MIN(fecha))) / 86400), :ventana)))::int AS ventana_global
                FROM kardex_movimientos_articulos WHERE id_empresa = :emp AND tipo_movimiento = 'VENTA'
            ),
            primera AS (
                SELECT id_articulo, MIN(fecha) AS primera FROM kardex_movimientos_articulos WHERE id_empresa = :emp GROUP BY id_articulo
            ),
            mov AS (
                SELECT k.id_articulo,
                       SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento ELSE 0 END)::float AS vendidas,
                       SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' THEN k.cantidad_movimiento ELSE 0 END)::float AS devueltas,
                       SUM(CASE WHEN k.tipo_movimiento = 'VENTA' AND (k.fecha AT TIME ZONE ${TZ})::date >= :desde
                                THEN k.cantidad_movimiento ELSE 0 END)::float AS vendidas_periodo,
                       COUNT(DISTINCT k.fecha::date) FILTER (WHERE k.tipo_movimiento = 'VENTA')::int AS dias_con_venta
                FROM kardex_movimientos_articulos k
                WHERE k.id_empresa = :emp AND k.fecha >= NOW() - (:ventana * INTERVAL '1 day')
                  AND (k.tipo_movimiento = 'VENTA' OR (k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%'))
                GROUP BY k.id_articulo
            )
            SELECT m.id_articulo, m.vendidas, m.devueltas, m.vendidas_periodo, m.dias_con_venta,
                   GREATEST(7, LEAST((SELECT ventana_global FROM base),
                                     COALESCE(CEIL(EXTRACT(EPOCH FROM (NOW() - p.primera)) / 86400), :ventana)))::int AS ventana
            FROM mov m LEFT JOIN primera p ON p.id_articulo = m.id_articulo
        `, { emp: id_empresa, desde, ventana: VENTANA_DIAS });
        const ventaPorArt = new Map<string, any>(ventas.map(v => [String(v.id_articulo), v]));

        // ── 3. Existencia y valor al costo por artículo ──────────────────────────────────────────────────────
        const stock = await consulta(`
            SELECT s.id_articulo,
                   SUM(s.cantidad)::float AS existencia,
                   SUM(COALESCE(s.cantidad_apartada, 0))::float AS apartada,
                   SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0))::float AS valor
            FROM stock_ubicacion_lote s
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
            GROUP BY s.id_articulo
        `, { emp: id_empresa });
        const stockPorArt = new Map<string, any>(stock.map(s => [String(s.id_articulo), s]));
        const inventario_valor = r2(stock.reduce((s, x) => s + num(x.valor), 0));

        // ── 4. Ventas del periodo al costo (menos devoluciones de clientes que regresaron) ───────────────────
        const [mov] = await consulta(`
            SELECT COALESCE(SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento * COALESCE(l.precio_costo_lote_sucursal, 0) END), 0)::float AS venta_costo,
                   COALESCE(SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento END), 0)::float AS venta_piezas,
                   COALESCE(SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' THEN k.cantidad_movimiento * COALESCE(l.precio_costo_lote_sucursal, 0) END), 0)::float AS dev_costo
            FROM kardex_movimientos_articulos k
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = k.id_lote
            WHERE k.id_empresa = :emp
              AND (k.fecha AT TIME ZONE ${TZ})::date BETWEEN :desde AND :hasta
              AND (k.tipo_movimiento = 'VENTA' OR (k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%'))
        `, { emp: id_empresa, desde, hasta });
        const ventas_costo = r2(Math.max(0, num(mov?.venta_costo) - num(mov?.dev_costo)));

        // ── 5. Datos de los artículos (nombre y código) ──────────────────────────────────────────────────────
        const idsInteres = Array.from(new Set([...compras.map(c => String(c.id_articulo)), ...stock.map(s => String(s.id_articulo))]));
        const arts = idsInteres.length ? await consulta(
            `SELECT id_artic, cod_int_artic, des_artic FROM articulo WHERE id_artic IN (:ids)`, { ids: idsInteres }) : [];
        const artPor = new Map<string, any>(arts.map(a => [String(a.id_artic), a]));

        // ── 6. Clasificar cada artículo comprado ─────────────────────────────────────────────────────────────
        const filasCompra = compras.map(c => {
            const id = String(c.id_articulo);
            const v = ventaPorArt.get(id);
            const s = stockPorArt.get(id);
            const neta = Math.max(0, num(v?.vendidas) - num(v?.devueltas));
            const ventana = Math.max(1, num(v?.ventana) || VENTANA_DIAS);
            const pzDia = neta / ventana;
            const disponible = Math.max(0, num(s?.existencia) - num(s?.apartada));
            const diasInv = pzDia > 0 ? disponible / pzDia : null;

            let clase: ClaseCompra;
            if (neta <= 0 && disponible > 0) clase = 'SIN_MOVIMIENTO';
            else if (disponible <= 0) clase = 'AGOTADA';
            else if (diasInv! > DIAS_SOBRECOMPRA) clase = 'SOBRECOMPRA';
            else if (diasInv! > DIAS_VIGILAR) clase = 'VIGILAR';
            else if (diasInv! >= DIAS_CORTA) clase = 'ACERTADA';
            else clase = 'CORTA';

            const comprado = num(c.comprado);
            const vendidoPeriodo = num(v?.vendidas_periodo);
            const a = artPor.get(id);
            return {
                id_artic: id,
                cod_int_artic: num(a?.cod_int_artic),
                des_artic: String(a?.des_artic ?? '').trim(),
                comprado: r2(comprado),
                valor: r2(num(c.valor)),
                facturas: num(c.facturas),
                ultima_compra: ultimaCompra.get(id) ?? null,
                vendido_periodo: r2(vendidoPeriodo),
                vendido_pct: comprado > 0 ? Math.min(100, Math.round((vendidoPeriodo / comprado) * 100)) : 0,
                disponible: r2(disponible),
                pz_dia: +pzDia.toFixed(2),
                dias_inventario: diasInv === null ? null : Math.round(diasInv),
                dias_con_venta: num(v?.dias_con_venta),
                clase,
            };
        }).sort((a, b) => b.valor - a.valor);

        const compras_valor = r2(filasCompra.reduce((s, x) => s + x.valor, 0));
        const compras_piezas = r2(filasCompra.reduce((s, x) => s + x.comprado, 0));

        const ORDEN: ClaseCompra[] = ['ACERTADA', 'CORTA', 'AGOTADA', 'VIGILAR', 'SOBRECOMPRA', 'SIN_MOVIMIENTO'];
        const clases = ORDEN.map(clase => {
            const fs = filasCompra.filter(f => f.clase === clase);
            const valor = r2(fs.reduce((s, x) => s + x.valor, 0));
            return { clase, articulos: fs.length, valor, pct: compras_valor > 0 ? Math.round((valor / compras_valor) * 100) : 0 };
        });
        const valorDe = (c: ClaseCompra) => clases.find(x => x.clase === c)?.valor ?? 0;
        const pct_mala = compras_valor > 0 ? ((valorDe('SOBRECOMPRA') + valorDe('SIN_MOVIMIENTO')) / compras_valor) * 100 : 0;

        // ── 7. Dinero parado: existencia de artículos que no se han vendido en la ventana ─────────────────────
        const parado = stock
            .map(s => {
                const id = String(s.id_articulo);
                const v = ventaPorArt.get(id);
                const neta = num(v?.vendidas) - num(v?.devueltas);
                const a = artPor.get(id);
                return {
                    id_artic: id,
                    cod_int_artic: num(a?.cod_int_artic),
                    des_artic: String(a?.des_artic ?? '').trim(),
                    existencia: r2(num(s.existencia)),
                    valor: r2(num(s.valor)),
                    ultima_compra: ultimaCompra.get(id) ?? null,
                    neta,
                };
            })
            .filter(x => x.neta <= 0 && x.valor > 0)
            .sort((a, b) => b.valor - a.valor);
        const parado_valor = r2(parado.reduce((s, x) => s + x.valor, 0));
        const parado_pct = inventario_valor > 0 ? (parado_valor / inventario_valor) * 100 : 0;

        // ── 8. Lo que SÍ se vende y no se está comprando (agotado / crítico / bajo, sin tránsito ni recibo) ───
        let desabasto: any[] = [];
        let desabasto_total = 0;
        try {
            const r = await DiasInventarioService.getLista(id_empresa, VENTANA_DIAS, 1_000_000, 1, true, 'sin');
            desabasto_total = r.total_listados;
            desabasto = r.articulos
                .sort((a, b) => b.pz_dia - a.pz_dia)
                .slice(0, 25)
                .map(a => ({
                    id_artic: a.id_artic, cod_int_artic: a.cod_int_artic, des_artic: String(a.des_artic ?? '').trim(),
                    disponible: a.disponible, pz_dia: a.pz_dia, dias_inventario: a.dias_inventario, semaforo: a.semaforo, confianza: a.confianza,
                    ultima_compra: ultimaCompra.get(String(a.id_artic)) ?? null,
                }));
        } catch (e: any) {
            console.error('[AnalisisCompras] desabasto:', e?.message ?? e);
        }

        // ── 9. Inventario: ¿sube, baja o se mantiene? ────────────────────────────────────────────────────────
        // Lo que había al inicio se estima: hoy − lo comprado + lo vendido (al costo). No hay fotos diarias del inventario.
        const inventario_inicio_est = r2(Math.max(0, inventario_valor - compras_valor + ventas_costo));
        const variacion_valor = r2(compras_valor - ventas_costo);
        const variacion_pct = inventario_inicio_est > 0 ? Math.round((variacion_valor / inventario_inicio_est) * 100) : null;
        const ratio = ventas_costo > 0 ? compras_valor / ventas_costo : null;
        const estado_inventario: 'SUBIENDO' | 'BAJANDO' | 'ESTABLE' | 'SIN_DATOS' =
            ratio === null ? 'SIN_DATOS' : ratio < 0.85 ? 'BAJANDO' : ratio <= 1.15 ? 'ESTABLE' : 'SUBIENDO';
        const dias_inventario_global = ventas_costo > 0 ? Math.round(inventario_valor / (ventas_costo / dias_periodo)) : null;

        // ── 10. Veredicto ────────────────────────────────────────────────────────────────────────────────────
        type Nivel = 'ok' | 'warn' | 'bad';
        const puntos: { nivel: Nivel; texto: string }[] = [];
        let score = 100;

        if (filasCompra.length === 0) {
            puntos.push({ nivel: 'warn', texto: 'No hay compras con lotes registrados en este periodo: no hay nada que evaluar. Amplía las fechas.' });
        } else {
            // Qué tanto de lo comprado está bien
            const buenas = valorDe('ACERTADA') + valorDe('CORTA') + valorDe('AGOTADA');
            const pctBuenas = compras_valor > 0 ? Math.round((buenas / compras_valor) * 100) : 0;
            if (pct_mala > 40) { score -= 35; puntos.push({ nivel: 'bad', texto: `${Math.round(pct_mala)}% de lo comprado (${money(valorDe('SOBRECOMPRA') + valorDe('SIN_MOVIMIENTO'))}) es sobrecompra o no se mueve: es dinero que tardará mucho en regresar.` }); }
            else if (pct_mala > 25) { score -= 20; puntos.push({ nivel: 'warn', texto: `${Math.round(pct_mala)}% de lo comprado (${money(valorDe('SOBRECOMPRA') + valorDe('SIN_MOVIMIENTO'))}) es sobrecompra o no se mueve.` }); }
            else if (pct_mala > 12) { score -= 10; puntos.push({ nivel: 'warn', texto: `${Math.round(pct_mala)}% de lo comprado es sobrecompra o no se mueve: poco, pero vigílalo.` }); }
            else puntos.push({ nivel: 'ok', texto: `Solo ${Math.round(pct_mala)}% de lo comprado es sobrecompra o no se mueve.` });
            puntos.push({ nivel: pctBuenas >= 60 ? 'ok' : 'warn', texto: `${pctBuenas}% de lo comprado (${money(buenas)}) se está vendiendo bien o ya se agotó.` });
        }

        if (ratio !== null) {
            const txt = estado_inventario === 'ESTABLE'
                ? `Compraste ${money(compras_valor)} y vendiste ${money(ventas_costo)} (al costo): el inventario se mantiene (${ratio.toFixed(2)} compras por cada $1 vendido).`
                : estado_inventario === 'SUBIENDO'
                    ? `Compraste ${money(compras_valor)} y vendiste ${money(ventas_costo)} (al costo): el inventario va subiendo (+${money(variacion_valor)}).`
                    : `Compraste ${money(compras_valor)} y vendiste ${money(ventas_costo)} (al costo): el inventario va bajando (${money(variacion_valor)}).`;
            puntos.push({ nivel: 'ok', texto: txt });
        }

        if (dias_inventario_global !== null) {
            if (dias_inventario_global > 120) { score -= 25; puntos.push({ nivel: 'bad', texto: `Tu inventario (${money(inventario_valor)}) alcanza para ${dias_inventario_global} días de venta: es demasiado, hay mucho dinero detenido.` }); }
            else if (dias_inventario_global > 90) { score -= 15; puntos.push({ nivel: 'warn', texto: `Tu inventario alcanza para ${dias_inventario_global} días de venta: alto.` }); }
            else if (dias_inventario_global > 60) { score -= 8; puntos.push({ nivel: 'warn', texto: `Tu inventario alcanza para ${dias_inventario_global} días de venta: un poco alto.` }); }
            else if (dias_inventario_global < 15) { score -= 15; puntos.push({ nivel: 'warn', texto: `Tu inventario alcanza para solo ${dias_inventario_global} días de venta: riesgo de quedarte sin producto.` }); }
            else puntos.push({ nivel: 'ok', texto: `Tu inventario alcanza para ${dias_inventario_global} días de venta: un nivel sano.` });
        }

        if (parado_pct > 25) { score -= 15; puntos.push({ nivel: 'bad', texto: `${Math.round(parado_pct)}% de tu inventario (${money(parado_valor)}, ${parado.length} artículos) no ha vendido nada en ${VENTANA_DIAS} días.` }); }
        else if (parado_pct > 12) { score -= 8; puntos.push({ nivel: 'warn', texto: `${Math.round(parado_pct)}% de tu inventario (${money(parado_valor)}) no ha vendido nada en ${VENTANA_DIAS} días.` }); }
        else if (inventario_valor > 0) puntos.push({ nivel: 'ok', texto: `Solo ${Math.round(parado_pct)}% de tu inventario está sin movimiento.` });

        if (desabasto_total >= 15) { score -= 20; puntos.push({ nivel: 'bad', texto: `${desabasto_total} artículos que sí se venden están agotados o por agotarse y no tienen compra en camino.` }); }
        else if (desabasto_total >= 8) { score -= 12; puntos.push({ nivel: 'warn', texto: `${desabasto_total} artículos que sí se venden están agotados o por agotarse y no tienen compra en camino.` }); }
        else if (desabasto_total >= 3) { score -= 5; puntos.push({ nivel: 'warn', texto: `${desabasto_total} artículos que sí se venden están por agotarse sin compra en camino.` }); }
        else puntos.push({ nivel: 'ok', texto: 'Casi no hay artículos vendibles agotados sin compra en camino.' });

        score = Math.max(0, Math.min(100, score));
        const nivel: 'BUENO' | 'REGULAR' | 'MALO' = filasCompra.length === 0 ? 'REGULAR' : score >= 75 ? 'BUENO' : score >= 50 ? 'REGULAR' : 'MALO';

        // Respuesta a "el inventario no sube ni baja: ¿es bueno o malo?"
        let explicacion_inventario = '';
        if (estado_inventario === 'ESTABLE') {
            explicacion_inventario = (dias_inventario_global !== null && dias_inventario_global > 60) || pct_mala > 25 || parado_pct > 12
                ? 'Que el inventario no suba ni baje NO es bueno por sí solo: está estable, pero en un nivel alto o con mucha mercancía que no se mueve. Estás comprando lo mismo que vendes, pero parte de lo comprado no es lo que se vende.'
                : desabasto_total >= 8
                    ? 'El inventario está estable, pero por dentro está desbalanceado: se compra lo que no se vende mientras se agota lo que sí. El total no cambia, pero la mezcla es mala.'
                    : 'Un inventario estable es buena señal aquí: compras al ritmo de lo que vendes, y la mercancía comprada sí se mueve.';
        } else if (estado_inventario === 'SUBIENDO') {
            explicacion_inventario = 'El inventario va subiendo porque compras más de lo que vendes. Es sano solo si es una compra de temporada o por una oferta; si se vuelve constante, el dinero se queda detenido.';
        } else if (estado_inventario === 'BAJANDO') {
            explicacion_inventario = 'El inventario va bajando porque vendes más de lo que compras. Es bueno si venías sobrado; si ya está bajo, cuida el desabasto.';
        } else {
            explicacion_inventario = 'No hay ventas registradas en el periodo, así que no se puede comparar compras contra ventas.';
        }

        // Recomendaciones concretas
        const recomendaciones: string[] = [];
        const topSobre = filasCompra.filter(f => f.clase === 'SOBRECOMPRA' || f.clase === 'SIN_MOVIMIENTO').slice(0, 3);
        if (topSobre.length) recomendaciones.push(`No recompres por ahora: ${topSobre.map(f => f.des_artic).join(', ')}.`);
        if (desabasto_total > 0) {
            const topDes = desabasto.slice(0, 3).map(a => a.des_artic);
            recomendaciones.push(`Compra primero lo que se vende y no tiene compra: ${topDes.join(', ')}${desabasto_total > 3 ? ' y más (ver la lista)' : ''}.`);
        }
        if (parado.length && parado_pct > 12) {
            recomendaciones.push(`Mueve el inventario parado: ofertas, devolución al proveedor o traspaso a otra sucursal. Los 3 que más dinero detienen: ${parado.slice(0, 3).map(p => p.des_artic).join(', ')}.`);
        }
        if (valorDe('CORTA') + valorDe('AGOTADA') > 0 && filasCompra.some(f => f.clase === 'CORTA' || f.clase === 'AGOTADA')) {
            const rapidas = filasCompra.filter(f => f.clase === 'CORTA' || f.clase === 'AGOTADA').slice(0, 3).map(f => f.des_artic);
            recomendaciones.push(`Compra más cantidad de lo que rota rápido: ${rapidas.join(', ')}.`);
        }

        return {
            periodo: { desde, hasta, dias: dias_periodo },
            ventana_dias: VENTANA_DIAS,
            umbrales: { corta: DIAS_CORTA, vigilar: DIAS_VIGILAR, sobrecompra: DIAS_SOBRECOMPRA },
            veredicto: { nivel, score, estado_inventario, explicacion_inventario, puntos, recomendaciones },
            resumen: {
                compras_valor, compras_piezas, compras_articulos: filasCompra.length,
                ventas_costo, ventas_piezas: r2(num(mov?.venta_piezas)),                inventario_valor, inventario_inicio_estimado: inventario_inicio_est, variacion_valor, variacion_pct,
                ratio_compra_venta: ratio === null ? null : +ratio.toFixed(2),
                dias_inventario_global,
                parado_valor, parado_pct: Math.round(parado_pct), parado_articulos: parado.length,
                desabasto_total,
            },
            clases,
            compras: filasCompra.slice(0, 400),
            parado: parado.slice(0, 30).map(({ neta, ...r }) => r),
            desabasto,
            generado: new Date().toISOString(),
        };
    },
};

function money(n: number): string {
    return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
