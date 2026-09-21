import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import { Kardex_Movimiento_ArticuloRepository, IFiltrosMovimientos } from '../repositories/Kardex_Movimiento_Articulo.repository';

// Signo de cada tipo del kardex (TRASLADO y AJUSTE no mueven la existencia total)
const SIGNO_KARDEX: Record<string, number> = { ENTRADA: 1, SURTIDO: 1, SALIDA: -1, VENTA: -1, TRASLADO: 0, AJUSTE: 0 };

export const KardexService = {

    // Kardex de UN artículo: movimientos en orden cronológico con entrada / salida / saldo corrido.
    // Junta el kardex (ventas, cancelaciones, devoluciones) con los movimientos manuales de almacén (ajustes, mermas).
    // El saldo se ancla a la existencia actual (stock_ubicacion_lote): el saldo final del último movimiento es lo que hay hoy.
    getKardexArticulo: async (id_empresa: string, id_articulo: string, fecha_inicio?: string, fecha_fin?: string) => {
        const [art] = await dbLocal.query<any>(
            `SELECT id_artic, des_artic, cod_barr_artic, cod_int_artic FROM articulo WHERE id_artic = :id_articulo`,
            { replacements: { id_articulo }, type: QueryTypes.SELECT });
        if (!art) throw new Error('Artículo no encontrado.');

        const rows = await dbLocal.query<any>(`
            SELECT * FROM (
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
            ORDER BY x.fecha ASC, x.origen ASC
        `, { replacements: { id_empresa, id_articulo }, type: QueryTypes.SELECT });

        const lotesIds = Array.from(new Set(rows.map((r: any) => r.id_lote).filter(Boolean)));
        const empIds = Array.from(new Set(rows.map((r: any) => r.id_empleado).filter(Boolean)));
        const pedIds = Array.from(new Set(rows.map((r: any) => r.id_pedido).filter(Boolean)));
        const lotes = lotesIds.length ? await dbLocal.query<any>(
            `SELECT id_lote_sucursal, numero_lote_sucursal FROM lote_articulo_sucursal WHERE id_lote_sucursal IN (:ids)`,
            { replacements: { ids: lotesIds }, type: QueryTypes.SELECT }) : [];
        const emps = empIds.length ? await dbLocal.query<any>(
            `SELECT id_empleado, nombre_empleado, ap_pat_empleado FROM empleado WHERE id_empleado IN (:ids)`,
            { replacements: { ids: empIds }, type: QueryTypes.SELECT }) : [];
        const peds = pedIds.length ? await dbLocal.query<any>(
            `SELECT id_pedido_alm, cod_int_pedido_alm FROM pedido_almacen WHERE id_pedido_alm IN (:ids)`,
            { replacements: { ids: pedIds }, type: QueryTypes.SELECT }) : [];
        const loteMap = new Map(lotes.map((l: any) => [l.id_lote_sucursal, String(l.numero_lote_sucursal).trim()]));
        const empMap = new Map(emps.map((e: any) => [e.id_empleado, `${e.nombre_empleado} ${e.ap_pat_empleado}`.trim()]));
        const pedMap = new Map(peds.map((p: any) => [p.id_pedido_alm, p.cod_int_pedido_alm]));

        const movs = rows.map((r: any) => {
            const cant = Number(r.cantidad) || 0;
            let signo: number;
            if (r.origen === 'M') signo = r.tipo === 'AJUSTE_ENTRADA' ? 1 : -1;
            else signo = SIGNO_KARDEX[r.tipo] ?? 0;
            return {
                id: r.id, fecha: r.fecha, tipo: r.tipo, origen: r.origen,
                documento_ref: r.documento_ref ?? null, notas: r.notas ?? null,
                lote: r.id_lote ? (loteMap.get(r.id_lote) ?? null) : null,
                pedido: r.id_pedido ? (pedMap.get(r.id_pedido) ?? null) : null,
                empleado: r.id_empleado ? (empMap.get(r.id_empleado) ?? null) : null,
                entrada: signo > 0 ? cant : 0,
                salida: signo < 0 ? cant : 0,
                neutro: signo === 0 ? cant : 0,
            };
        });

        const [{ existencia }] = await dbLocal.query<any>(
            `SELECT COALESCE(SUM(cantidad), 0) AS existencia FROM stock_ubicacion_lote
             WHERE id_empresa_sucursal = :id_empresa AND id_articulo = :id_articulo`,
            { replacements: { id_empresa, id_articulo }, type: QueryTypes.SELECT });
        const existencia_actual = Number(existencia) || 0;

        // Saldo anclado a la existencia actual
        const netoTotal = movs.reduce((s: number, m: any) => s + m.entrada - m.salida, 0);
        let saldo = existencia_actual - netoTotal;   // saldo antes del primer movimiento registrado
        const conSaldo = movs.map((m: any) => {
            saldo += m.entrada - m.salida;
            return { ...m, saldo };
        });

        const desde = fecha_inicio ? new Date(fecha_inicio + 'T00:00:00').getTime() : null;
        const hasta = fecha_fin ? new Date(fecha_fin + 'T23:59:59').getTime() : null;
        const enPeriodo = conSaldo.filter((m: any) => {
            const t = new Date(m.fecha).getTime();
            return (desde == null || t >= desde) && (hasta == null || t <= hasta);
        });
        const antesDelPeriodo = desde == null ? [] : conSaldo.filter((m: any) => new Date(m.fecha).getTime() < desde);
        const saldo_inicial = antesDelPeriodo.length
            ? antesDelPeriodo[antesDelPeriodo.length - 1].saldo
            : (existencia_actual - netoTotal);

        return {
            articulo: { id_artic: art.id_artic, des_artic: art.des_artic, cod_barr_artic: art.cod_barr_artic, cod_int_artic: art.cod_int_artic },
            existencia_actual,
            saldo_inicial,
            total_entradas: enPeriodo.reduce((s: number, m: any) => s + m.entrada, 0),
            total_salidas: enPeriodo.reduce((s: number, m: any) => s + m.salida, 0),
            saldo_final: enPeriodo.length ? enPeriodo[enPeriodo.length - 1].saldo : saldo_inicial,
            // Piezas de la existencia actual que ningún movimiento explica (compras/migración/ajustes anteriores al kardex)
            sin_movimiento_previo: existencia_actual - netoTotal,
            movimientos: enPeriodo,
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
