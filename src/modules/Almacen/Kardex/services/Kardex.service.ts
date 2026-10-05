import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import { Kardex_Movimiento_ArticuloRepository, IFiltrosMovimientos } from '../repositories/Kardex_Movimiento_Articulo.repository';

export const KardexService = {

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
