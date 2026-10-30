import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import { Kardex_Movimiento_ArticuloRepository, IFiltrosMovimientos } from '../repositories/Kardex_Movimiento_Articulo.repository';

const dosDig = (n: number) => String(n).padStart(2, '0');
const diaLocal = (d: Date) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;

export const KardexService = {

    // Movimientos INTERNOS de un artículo (no cambian la existencia): meter a tarima, sacar de tarima, mover entre ubicaciones,
    // acomodar y tomar para un pedido. Se piden aparte (casilla "Movimientos de artículos") y por día, con un tope de renglones,
    // para que no pese en el kardex normal. Sin fechas, trae los últimos 30 días.
    getMovimientosInternos: async (id_empresa: string, id_articulo: string, fecha_inicio?: string, fecha_fin?: string) => {
        const LIMITE = 1500;
        let ini = fecha_inicio;
        let fin = fecha_fin;
        if (!ini && !fin) {
            const hoy = new Date();
            const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
            ini = diaLocal(hace30);
            fin = diaLocal(hoy);
        }
        const rep: Record<string, any> = { id_empresa, id_articulo };
        if (ini) rep.desde = new Date(ini + 'T00:00:00').toISOString();
        if (fin) rep.hasta = new Date(fin + 'T23:59:59').toISOString();
        const filtroFecha = (col: string) => [ini ? `${col} >= :desde::timestamptz` : '', fin ? `${col} <= :hasta::timestamptz` : '']
            .filter(Boolean).join(' AND ') || 'TRUE';

        const filas = await dbLocal.query<any>(`
            WITH k AS (
                SELECT x.id_kardex_movimientos::text AS id, x.fecha, x.cantidad_movimiento AS cantidad, x.id_lote::text AS id_lote,
                       x.id_origen_ubicacion::text AS id_origen, x.id_destino_ubicacion::text AS id_destino,
                       x.id_pedido::text AS id_pedido, x.id_empleado::text AS id_empleado, x.notas,
                       -- Surtidos registrados antes de guardar "app"/"hoja": se deduce de la asignación (sin inicio = hoja)
                       CASE WHEN x.notas LIKE 'Surtido%' AND x.notas NOT LIKE '%(app)%' AND x.notas NOT LIKE '%(hoja)%'
                            THEN (SELECT CASE WHEN a2.inicio IS NULL THEN 'hoja' ELSE 'app' END
                                  FROM detalle_pedido_almacen d2
                                  JOIN detalle_pedido_almacen_asignacion a2 ON a2.id_detalle_pedido_almacen = d2.id_detalle_pedido_almacen
                                  WHERE d2.id_pedido_almacen = x.id_pedido AND d2.id_articulo = x.id_articulo LIMIT 1)
                       END AS via_inf
                FROM kardex_movimientos_articulos x
                WHERE x.id_empresa = :id_empresa AND x.id_articulo = :id_articulo
                  AND x.tipo_movimiento::text = 'TRASLADO' AND x.categoria::text = 'Movimiento_Interno'
                  AND ${filtroFecha('x.fecha')}
            ),
            -- Surtidos de antes de este registro: se arman con el lote surtido y la hora en que terminó el surtidor
            d AS (
                SELECT l.id_detalle_pedido_almacen_lote::text AS id, a.fin AS fecha, l.cantidad::numeric AS cantidad, l.id_lote_sucursal::text AS id_lote,
                       NULL::text AS id_origen, NULL::text AS id_destino, p.id_pedido_alm::text AS id_pedido, a.id_usuario::text AS id_empleado,
                       -- Con hoja, todas las asignaciones del pedido se cierran juntas y nunca pasan por "inicio"; con la app sí
                       CASE WHEN a.inicio IS NULL THEN 'Surtido (hoja)' ELSE 'Surtido (app)' END AS notas,
                       NULL::text AS via_inf
                FROM detalle_pedido_almacen_lote l
                JOIN detalle_pedido_almacen dp ON dp.id_detalle_pedido_almacen = l.id_detalle_pedido_almacen
                JOIN pedido_almacen p ON p.id_pedido_alm = dp.id_pedido_almacen
                JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = l.id_lote_sucursal AND las.id_empre = :id_empresa
                JOIN detalle_pedido_almacen_asignacion a ON a.id_detalle_pedido_almacen = dp.id_detalle_pedido_almacen
                                                         AND a.estado = 'TERMINADO' AND a.fin IS NOT NULL
                WHERE dp.id_articulo = :id_articulo AND ${filtroFecha('a.fin')}
                  AND NOT EXISTS (SELECT 1 FROM kardex_movimientos_articulos kx
                                  WHERE kx.id_pedido = p.id_pedido_alm AND kx.id_articulo = :id_articulo AND kx.notas LIKE 'Surtido%')
            )
            SELECT * FROM (SELECT * FROM k UNION ALL SELECT * FROM d) u
            ORDER BY fecha DESC
            LIMIT ${LIMITE}
        `, { replacements: rep, type: QueryTypes.SELECT });

        const ids = (campo: string) => Array.from(new Set(filas.map((f: any) => f[campo]).filter(Boolean)));
        const lotesIds = ids('id_lote'); const empIds = ids('id_empleado'); const pedIds = ids('id_pedido');
        const ubIds = Array.from(new Set([...ids('id_origen'), ...ids('id_destino')]));

        const lotes = lotesIds.length ? await dbLocal.query<any>(
            `SELECT id_lote_sucursal::text AS id, numero_lote_sucursal FROM lote_articulo_sucursal WHERE id_lote_sucursal::text IN (:ids)`,
            { replacements: { ids: lotesIds }, type: QueryTypes.SELECT }) : [];
        const emps = empIds.length ? await dbLocal.query<any>(
            `SELECT id_empleado::text AS id, nombre_empleado, ap_pat_empleado FROM empleado WHERE id_empleado::text IN (:ids)`,
            { replacements: { ids: empIds }, type: QueryTypes.SELECT }) : [];
        const peds = pedIds.length ? await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm::text AS id, pa.cod_int_pedido_alm, COALESCE(NULLIF(TRIM(ca.nom_corto_cliente_alm), ''), NULLIF(TRIM(ca.razon_social_cliente_alm), '')) AS cliente
            FROM pedido_almacen pa LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE pa.id_pedido_alm::text IN (:ids)`, { replacements: { ids: pedIds }, type: QueryTypes.SELECT }) : [];
        const ubs = ubIds.length ? await dbLocal.query<any>(`
            SELECT id_ubicacion_sucursal::text AS id, tarima_ub, pasillo_ub, anaquel_ub, nivel_ub, posicion_ub
            FROM ubicacion_sucursal WHERE id_ubicacion_sucursal::text IN (:ids)`, { replacements: { ids: ubIds }, type: QueryTypes.SELECT }) : [];

        const loteMap = new Map(lotes.map((l: any) => [l.id, String(l.numero_lote_sucursal).trim()]));
        const empMap = new Map(emps.map((e: any) => [e.id, `${e.nombre_empleado} ${e.ap_pat_empleado}`.trim()]));
        const pedMap = new Map(peds.map((p: any) => [p.id, { folio: String(p.cod_int_pedido_alm).trim(), cliente: p.cliente ?? null }]));
        const ubMap = new Map(ubs.map((u: any) => [u.id, String(u.tarima_ub ?? '').trim()
            ? `Tarima ${String(u.tarima_ub).trim()}`
            : [u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-')]));

        const items = filas.map((f: any) => {
            const notas = String(f.notas ?? '');
            const origen = f.id_origen ? (ubMap.get(f.id_origen) ?? null) : null;
            const ped = f.id_pedido ? pedMap.get(f.id_pedido) : null;
            const destino = f.id_destino ? (ubMap.get(f.id_destino) ?? null) : (ped ? `Pedido ${ped.folio}` : null);
            const esTarima = (t: string | null) => !!t && t.startsWith('Tarima');
            const accion = /^Surtido/i.test(notas) ? 'PEDIDO'
                : esTarima(destino) ? 'METER_TARIMA'
                : esTarima(origen) ? 'SACAR_TARIMA'
                : /^Acomodo/i.test(notas) ? 'ACOMODO'
                : 'MOVER';
            return {
                id: f.id, fecha: f.fecha, accion, cantidad: Number(f.cantidad) || 0,
                lote: f.id_lote ? (loteMap.get(f.id_lote) ?? null) : null,
                origen, destino,
                pedido: ped?.folio ?? null, cliente: ped?.cliente ?? null,
                empleado: f.id_empleado ? (empMap.get(f.id_empleado) ?? null) : null,
                // Solo para los surtidos: con hoja en papel o con la app
                via: /\(hoja\)/i.test(notas) || f.via_inf === 'hoja' ? 'HOJA' : /\(app\)/i.test(notas) || f.via_inf === 'app' ? 'APP' : null,
                notas: notas || null,
            };
        });

        // Por día (hora del servidor), del más reciente al más antiguo
        const porDia = new Map<string, typeof items>();
        for (const it of items) {
            const dia = diaLocal(new Date(it.fecha));
            if (!porDia.has(dia)) porDia.set(dia, []);
            porDia.get(dia)!.push(it);
        }
        return {
            desde: ini ?? null, hasta: fin ?? null,
            total: items.length, limitado: filas.length >= LIMITE,
            dias: Array.from(porDia.entries()).map(([dia, lista]) => ({ dia, total: lista.length, items: lista })),
        };
    },


    // Artículos cuyo SALDO INICIAL del kardex es negativo (sin filtrar por fechas): lo que el kardex suma/resta de todos sus
    // movimientos es MÁS de lo que hay hoy en existencia. Mismo cálculo que el kardex de un artículo:
    //   saldo inicial = existencia actual − (suma de movimientos con signo)
    getSaldosInicialesNegativos: async (id_empresa: string) => {
        const filas = await dbLocal.query<any>(`
            WITH mov AS (
                SELECT x.id_articulo, x.cantidad,
                       CASE WHEN x.origen = 'M'
                            THEN CASE WHEN x.tipo IN ('AJUSTE_ENTRADA', 'INICIAL') THEN 1 ELSE -1 END
                            ELSE CASE x.tipo WHEN 'ENTRADA' THEN 1 WHEN 'SURTIDO' THEN 1 WHEN 'SALIDA' THEN -1 WHEN 'VENTA' THEN -1 ELSE 0 END
                       END AS signo
                FROM (
                    SELECT k.id_articulo, k.tipo_movimiento::text AS tipo, k.cantidad_movimiento AS cantidad, 'K' AS origen
                    FROM kardex_movimientos_articulos k WHERE k.id_empresa = :emp
                    UNION ALL
                    SELECT m.id_articulo, m.tipo_movimiento::text AS tipo, m.cantidad, 'M' AS origen
                    FROM movimiento_articulo m WHERE m.id_empresa = :emp
                ) x
            ),
            neto AS (
                SELECT id_articulo,
                       SUM(signo * cantidad)                              AS neto,
                       COALESCE(SUM(cantidad) FILTER (WHERE signo > 0), 0) AS entradas,
                       COALESCE(SUM(cantidad) FILTER (WHERE signo < 0), 0) AS salidas
                FROM mov GROUP BY id_articulo
            ),
            ex AS (
                SELECT id_articulo, SUM(cantidad) AS existencia
                FROM stock_ubicacion_lote WHERE id_empresa_sucursal = :emp GROUP BY id_articulo
            ),
            -- Ubicación de cada artículo para recorrer el almacén: su ubicación por defecto (estantería antes que tarima);
            -- si no tiene, donde hay más existencia
            ub AS (
                SELECT DISTINCT ON (z.id_articulo) z.id_articulo, z.id_ubicacion
                FROM (
                    SELECT aud.id_articulo, aud.id_ubicacion_default AS id_ubicacion, 1 AS prioridad,
                           (u.tipo_ubicacion::text = 'TARIMA') AS es_tarima, 0 AS cant
                    FROM articulo_ubicacion_default aud
                    JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = aud.id_ubicacion_default
                    WHERE aud.id_empresa_sucursal = :emp
                    UNION ALL
                    SELECT s.id_articulo, s.id_ubicacion_sucursal, 2, (u.tipo_ubicacion::text = 'TARIMA'), s.cantidad
                    FROM stock_ubicacion_lote s
                    JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
                    WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0
                ) z
                ORDER BY z.id_articulo, z.prioridad, z.es_tarima, z.cant DESC
            )
            SELECT a.id_artic, a.cod_int_artic, a.cod_barr_artic, a.des_artic,
                   COALESCE(ex.existencia, 0)                      AS existencia_actual,
                   n.entradas, n.salidas,
                   COALESCE(ex.existencia, 0) - n.neto             AS saldo_inicial,
                   u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub, u.tarima_ub, u.tipo_ubicacion::text AS tipo_ubicacion
            FROM neto n
            JOIN articulo a ON a.id_artic = n.id_articulo
            LEFT JOIN ex ON ex.id_articulo = n.id_articulo
            LEFT JOIN ub ON ub.id_articulo = n.id_articulo
            LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = ub.id_ubicacion
            WHERE COALESCE(ex.existencia, 0) - n.neto < 0
            -- Por ubicación en el orden del almacén: estanterías (pasillo, anaquel, nivel, posición), luego tarimas, luego sin ubicación
            ORDER BY (u.id_ubicacion_sucursal IS NULL),
                     (u.tipo_ubicacion::text = 'TARIMA'),
                     CASE u.pasillo_ub WHEN 'A1' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 WHEN 'D' THEN 5
                                       WHEN 'E' THEN 6 WHEN 'F' THEN 7 WHEN 'G' THEN 8 WHEN 'H' THEN 9 WHEN 'H1' THEN 10 ELSE 99 END,
                     NULLIF(regexp_replace(COALESCE(u.anaquel_ub, ''), '\\D', '', 'g'), '')::int NULLS LAST,
                     NULLIF(regexp_replace(COALESCE(u.nivel_ub, ''), '\\D', '', 'g'), '')::int NULLS LAST,
                     NULLIF(regexp_replace(COALESCE(u.posicion_ub, ''), '\\D', '', 'g'), '')::int NULLS LAST,
                     NULLIF(regexp_replace(COALESCE(u.tarima_ub, ''), '\\D', '', 'g'), '')::int NULLS LAST,
                     a.des_artic ASC`,
            { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
        return filas.map(f => ({
            ubicacion: f.tipo_ubicacion === 'TARIMA'
                ? `Tarima ${String(f.tarima_ub ?? '').trim()}`
                : f.pasillo_ub
                    ? [f.pasillo_ub, f.anaquel_ub, f.nivel_ub, f.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-')
                    : null,
            id_artic: f.id_artic as string,
            cod_int_artic: Number(f.cod_int_artic),
            cod_barr_artic: f.cod_barr_artic ? String(f.cod_barr_artic).trim() : null,
            des_artic: String(f.des_artic ?? '').trim(),
            existencia_actual: Number(f.existencia_actual) || 0,
            entradas: Number(f.entradas) || 0,
            salidas: Number(f.salidas) || 0,
            saldo_inicial: Number(f.saldo_inicial) || 0,
        }));
    },

    // Kardex de UN artículo: movimientos con entrada / salida / saldo corrido, PAGINADOS.
    // Junta el kardex (ventas, cancelaciones, devoluciones) con los movimientos manuales de almacén (ajustes, mermas).
    // El saldo se ancla a la existencia actual (stock_ubicacion_lote): el saldo final del último movimiento es lo que hay hoy.
    // Todo el cálculo (saldo corrido, totales del periodo) se hace en SQL; solo se traen y se completan (lote, cliente,
    // proveedor, empleado) los renglones de la página pedida, así el historial puede crecer sin volver lenta la consulta.
    getKardexArticulo: async (
        id_empresa: string, id_articulo: string, fecha_inicio?: string, fecha_fin?: string,
        opts: { page?: number; limit?: number; orden?: 'asc' | 'desc' } = {},
    ) => {
        const page = Math.max(1, Math.floor(opts.page ?? 1));
        const limit = Math.min(200, Math.max(5, Math.floor(opts.limit ?? 50)));
        const orden = opts.orden === 'asc' ? 'asc' : 'desc';

        const [art] = await dbLocal.query<any>(
            `SELECT id_artic, des_artic, cod_barr_artic, cod_int_artic FROM articulo WHERE id_artic = :id_articulo`,
            { replacements: { id_articulo }, type: QueryTypes.SELECT });
        if (!art) throw new Error('Artículo no encontrado.');

        // Mismos límites del periodo que antes: inicio del día de "desde" y fin del día de "hasta" (hora del servidor)
        const rep: Record<string, any> = { id_empresa, id_articulo };
        if (fecha_inicio) rep.desde = new Date(fecha_inicio + 'T00:00:00').toISOString();
        if (fecha_fin) rep.hasta = new Date(fecha_fin + 'T23:59:59').toISOString();
        const enPeriodo = [fecha_inicio ? 'fecha >= :desde::timestamptz' : '', fecha_fin ? 'fecha <= :hasta::timestamptz' : '']
            .filter(Boolean).join(' AND ') || 'TRUE';
        const antesDelPeriodo = fecha_inicio ? 'fecha < :desde::timestamptz' : 'FALSE';
        const hastaElCierre = fecha_fin ? 'fecha <= :hasta::timestamptz' : 'TRUE';

        // Movimientos del artículo con su signo (+1 entra, -1 sale, 0 no mueve la existencia total: TRASLADO y AJUSTE)
        const MOVS = `
            SELECT x.*,
                   CASE WHEN x.origen = 'M'
                        THEN CASE WHEN x.tipo IN ('AJUSTE_ENTRADA', 'INICIAL') THEN 1 ELSE -1 END
                        ELSE CASE x.tipo WHEN 'ENTRADA' THEN 1 WHEN 'SURTIDO' THEN 1 WHEN 'SALIDA' THEN -1 WHEN 'VENTA' THEN -1 ELSE 0 END
                   END AS signo
            FROM (
                SELECT k.id_kardex_movimientos AS id, k.fecha, k.tipo_movimiento::text AS tipo, k.cantidad_movimiento AS cantidad,
                       k.documento_ref, k.notas, k.id_lote, k.id_pedido, k.id_empleado, 'K' AS origen
                FROM kardex_movimientos_articulos k
                WHERE k.id_empresa = :id_empresa AND k.id_articulo = :id_articulo
                  -- Los movimientos internos (mover de tarima, acomodo, tomar para un pedido) no cambian la existencia:
                  -- se ven con la casilla "Movimientos de artículos"
                  AND COALESCE(k.categoria::text, '') <> 'Movimiento_Interno'
                UNION ALL
                SELECT m.id_movimiento_articulo AS id, m.fecha, m.tipo_movimiento::text AS tipo, m.cantidad,
                       m.documento_ref, m.notas, m.id_lote, NULL AS id_pedido, m.id_empleado, 'M' AS origen
                FROM movimiento_articulo m
                WHERE m.id_empresa = :id_empresa AND m.id_articulo = :id_articulo
            ) x
        `;

        const [{ existencia }] = await dbLocal.query<any>(
            `SELECT COALESCE(SUM(cantidad), 0) AS existencia FROM stock_ubicacion_lote
             WHERE id_empresa_sucursal = :id_empresa AND id_articulo = :id_articulo`,
            { replacements: { id_empresa, id_articulo }, type: QueryTypes.SELECT });
        const existencia_actual = Number(existencia) || 0;

        // Totales (de todo el historial y del periodo) sin traer renglones
        const [tot] = await dbLocal.query<any>(`
            WITH mov AS (${MOVS})
            SELECT COALESCE(SUM(signo * cantidad), 0)                                         AS neto_total,
                   COUNT(*) FILTER (WHERE ${enPeriodo})                                       AS total_movs,
                   COALESCE(SUM(cantidad) FILTER (WHERE signo > 0 AND ${enPeriodo}), 0)       AS entradas,
                   COALESCE(SUM(cantidad) FILTER (WHERE signo < 0 AND ${enPeriodo}), 0)       AS salidas,
                   COALESCE(SUM(signo * cantidad) FILTER (WHERE ${antesDelPeriodo}), 0)       AS neto_antes,
                   COALESCE(SUM(signo * cantidad) FILTER (WHERE ${hastaElCierre}), 0)         AS neto_hasta
            FROM mov
        `, { replacements: rep, type: QueryTypes.SELECT });

        const netoTotal = Number(tot?.neto_total) || 0;
        const base = existencia_actual - netoTotal;                  // saldo antes del primer movimiento registrado
        const totalMovs = Number(tot?.total_movs) || 0;
        const saldo_inicial = base + (Number(tot?.neto_antes) || 0);
        const saldo_final = totalMovs > 0 ? base + (Number(tot?.neto_hasta) || 0) : saldo_inicial;
        const totalPaginas = Math.max(1, Math.ceil(totalMovs / limit));
        const pagina = Math.min(page, totalPaginas);

        // Solo la página pedida; el saldo corrido sale de la suma acumulada de todo el historial
        const dir = orden === 'asc' ? 'ASC' : 'DESC';
        const rows = totalMovs === 0 ? [] : await dbLocal.query<any>(`
            WITH mov AS (${MOVS}),
            acum AS (
                SELECT mov.*,
                       SUM(signo * cantidad) OVER (ORDER BY fecha ASC, origen ASC, id::text ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado
                FROM mov
            )
            SELECT * FROM acum
            WHERE ${enPeriodo}
            ORDER BY fecha ${dir}, origen ${dir}, id::text ${dir}
            LIMIT :limit OFFSET :offset
        `, { replacements: { ...rep, limit, offset: (pagina - 1) * limit }, type: QueryTypes.SELECT });

        const lotesIds = Array.from(new Set(rows.map((r: any) => r.id_lote).filter(Boolean)));
        const empIds = Array.from(new Set(rows.map((r: any) => r.id_empleado).filter(Boolean)));
        const pedIds = Array.from(new Set(rows.map((r: any) => r.id_pedido).filter(Boolean)));
        // Para ENTRADA de compra, documento_ref guarda el id_factura_compra_proveedor (ver
        // registrarKardexEntradas en ChequeoFactura.js) — de ahí sacamos folio + proveedor.
        const facturaProveedorIds = Array.from(new Set(
            rows.filter((r: any) => r.tipo === 'ENTRADA' && r.documento_ref).map((r: any) => r.documento_ref)
        ));
        const lotes = lotesIds.length ? await dbLocal.query<any>(
            `SELECT id_lote_sucursal, numero_lote_sucursal FROM lote_articulo_sucursal WHERE id_lote_sucursal IN (:ids)`,
            { replacements: { ids: lotesIds }, type: QueryTypes.SELECT }) : [];
        const emps = empIds.length ? await dbLocal.query<any>(
            `SELECT id_empleado, nombre_empleado, ap_pat_empleado FROM empleado WHERE id_empleado IN (:ids)`,
            { replacements: { ids: empIds }, type: QueryTypes.SELECT }) : [];
        const peds = pedIds.length ? await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.cod_int_pedido_alm,
                   ca.razon_social_cliente_alm, ca.nom_corto_cliente_alm
            FROM pedido_almacen pa
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE pa.id_pedido_alm IN (:ids)
        `, { replacements: { ids: pedIds }, type: QueryTypes.SELECT }) : [];
        const facturasProveedor = facturaProveedorIds.length ? await dbLocal.query<any>(`
            SELECT fcp.id_factura_proveedor, fcp.folio_factura_proveedor, pr.nomcort_prove
            FROM factura_compra_proveedor fcp
            LEFT JOIN compra_proveedor cp ON cp.id_comp     = fcp.id_compra_prove_factura
            LEFT JOIN proveedor        pr ON pr.id_prove    = cp.idprove_comp
            WHERE fcp.id_factura_proveedor IN (:ids)
        `, { replacements: { ids: facturaProveedorIds }, type: QueryTypes.SELECT }) : [];

        const loteMap = new Map(lotes.map((l: any) => [l.id_lote_sucursal, String(l.numero_lote_sucursal).trim()]));
        const empMap = new Map(emps.map((e: any) => [e.id_empleado, `${e.nombre_empleado} ${e.ap_pat_empleado}`.trim()]));
        const pedMap = new Map(peds.map((p: any) => [p.id_pedido_alm, p.cod_int_pedido_alm]));
        const clienteMap = new Map(peds.map((p: any) => [
            p.id_pedido_alm,
            (p.nom_corto_cliente_alm?.trim() || p.razon_social_cliente_alm?.trim() || null),
        ]));
        const facturaProveedorMap = new Map(facturasProveedor.map((fp: any) => [
            fp.id_factura_proveedor,
            {
                folio: fp.folio_factura_proveedor ?? null,
                proveedor: fp.nomcort_prove?.trim() || null,
            },
        ]));

        const movimientos = rows.map((r: any) => {
            const cant = Number(r.cantidad) || 0;
            const signo = Number(r.signo) || 0;
            const fp = r.tipo === 'ENTRADA' && r.documento_ref ? facturaProveedorMap.get(r.documento_ref) : null;
            return {
                id: r.id, fecha: r.fecha, tipo: r.tipo, origen: r.origen,
                documento_ref: r.documento_ref ?? null, notas: r.notas ?? null,
                lote: r.id_lote ? (loteMap.get(r.id_lote) ?? null) : null,
                pedido: r.id_pedido ? (pedMap.get(r.id_pedido) ?? null) : null,
                cliente: r.id_pedido ? (clienteMap.get(r.id_pedido) ?? null) : null,
                proveedor: fp?.proveedor ?? null,
                folio_factura_proveedor: fp?.folio ?? null,
                empleado: r.id_empleado ? (empMap.get(r.id_empleado) ?? null) : null,
                entrada: signo > 0 ? cant : 0,
                salida: signo < 0 ? cant : 0,
                neutro: signo === 0 ? cant : 0,
                saldo: base + (Number(r.acumulado) || 0),
            };
        });

        return {
            articulo: { id_artic: art.id_artic, des_artic: art.des_artic, cod_barr_artic: art.cod_barr_artic, cod_int_artic: art.cod_int_artic },
            existencia_actual,
            saldo_inicial,
            total_entradas: Number(tot?.entradas) || 0,
            total_salidas: Number(tot?.salidas) || 0,
            saldo_final,
            // Piezas de la existencia actual que ningún movimiento explica (compras/migración/ajustes anteriores al kardex)
            sin_movimiento_previo: base,
            page: pagina,
            limit,
            orden,
            total_movimientos: totalMovs,
            total_paginas: totalPaginas,
            movimientos,
        };
    },

    crear: async (data: ICreateKardex_Movimiento) => {
        return await Kardex_Movimiento_ArticuloRepository.create(data);
    },

    obtenerMovimientos: async (filtros: IFiltrosMovimientos) => {
        return await Kardex_Movimiento_ArticuloRepository.findMovimientos(filtros);
    },
        
    obtenerProyecciones: async (opts: {
        empresas?: string[];
        id_articulo?: string;
        dias?: number;
        today?: string;
    }) => {
        return await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodos({
            empresas: opts.empresas,
            articulo: opts.id_articulo,
            dias: opts.dias,
            today: opts.today,
        });
    },
  

    // obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
    //     return await Kardex_Movimiento_ArticuloRepository.getExistencias(id_empresa, id_articulo);
    // },
};
