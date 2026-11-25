import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import { dbLocal } from '../../../../config/db';
import { etiquetaUbicacion } from '../../Existencias/services/Existencias.service';
import Cuadre_Alerta from '../model/Cuadre_Alerta.model';
import Cuadre_Snapshot from '../model/Cuadre_Snapshot.model';

const num = (v: unknown) => Number(v ?? 0) || 0;
const dia = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export type EstadoCuadre = 'CUADRA' | 'CONTAR' | 'EXPLICABLE' | 'NO_VERIFICABLE';

export interface ILoteCuadre {
    id_lote: string;
    cod_int_artic: number | string;
    articulo: string;
    numero_lote: string;
    caducidad: string | null;
    sistema: number;
    apartada: number;
    /** Conteo del inventario (movimiento INICIAL) y su fecha; null si el lote es nuevo o nunca se contó */
    base: number | null;
    fecha_conteo: string | null;
    entradas: number;
    ventas: number;
    otras_salidas: number;
    /** Piezas en tarimas que nunca se inventariaron (se suman a lo esperado tal como las tiene el sistema) */
    tarima_sin_inventariar: number;
    esperada: number | null;
    diferencia: number | null;
    estado: EstadoCuadre;
    entradas_sin_lote_articulo: number;
    origen: 'CONTEO' | 'KARDEX' | 'NINGUNO';
    ultima_venta: string | null;
}

const ORDEN_ESTADO: Record<EstadoCuadre, number> = { CONTAR: 0, EXPLICABLE: 1, NO_VERIFICABLE: 2, CUADRA: 3 };

// Cache corto por sucursal: el cálculo recorre todo el kardex y no hace falta rehacerlo en cada clic
const cache = new Map<string, { t: number; lotes: ILoteCuadre[] }>();
const CACHE_MS = 90_000;

/**
 * Cuánta existencia debería haber en cada lote según lo que se movió:
 *  - Lotes con conteo de inventario: conteo + entradas − ventas − otras salidas desde ese conteo (+ lo que haya en tarimas que no se inventariaron).
 *  - Lotes nuevos (sin conteo): entradas − salidas del kardex, si el lote tiene al menos una entrada registrada.
 *  - Sin conteo ni entradas (migrados): no se puede verificar.
 * Estado: CUADRA (igual), CONTAR (diferencia que no se explica), EXPLICABLE (hay entradas guardadas sin lote en el
 * kardex del artículo, así que la comparación no es concluyente) y NO_VERIFICABLE.
 */
async function calcular(id_empresa: string, forzar = false): Promise<ILoteCuadre[]> {
    const guardado = cache.get(id_empresa);
    if (!forzar && guardado && Date.now() - guardado.t < CACHE_MS) return guardado.lotes;

    const rep = { replacements: { emp: id_empresa }, type: QueryTypes.SELECT as const };
    const [lotes, stock, inis, movs, tarimas, sinLote] = await Promise.all([
        dbLocal.query<any>(`
            SELECT l.id_lote_sucursal AS id, TRIM(l.numero_lote_sucursal) AS lote, l.fecha_venci_lote_sucursal AS cad,
                   a.id_artic, a.cod_int_artic AS cod, TRIM(a.des_artic) AS art
            FROM lote_articulo_sucursal l JOIN articulo a ON a.id_artic = l.id_artic
            WHERE l.id_empre = :emp`, rep),
        dbLocal.query<any>(`
            SELECT id_lote, SUM(cantidad) AS e, SUM(COALESCE(cantidad_apartada, 0)) AS ap
            FROM stock_ubicacion_lote WHERE id_empresa_sucursal = :emp GROUP BY id_lote`, rep),
        dbLocal.query<any>(`
            SELECT id_lote, fecha, cantidad FROM movimiento_articulo
            WHERE tipo_movimiento = 'INICIAL' AND id_empresa = :emp AND id_lote IS NOT NULL`, rep),
        dbLocal.query<any>(`
            SELECT id_lote, fecha, tipo_movimiento::text AS t, cantidad AS c FROM movimiento_articulo
            WHERE tipo_movimiento IN ('AJUSTE_ENTRADA', 'SALIDA_MERMA') AND id_empresa = :emp AND id_lote IS NOT NULL
            UNION ALL
            SELECT id_lote, fecha, tipo_movimiento::text, cantidad_movimiento FROM kardex_movimientos_articulos
            WHERE tipo_movimiento IN ('ENTRADA', 'SALIDA', 'VENTA') AND id_empresa = :emp AND id_lote IS NOT NULL`, rep),
        dbLocal.query<any>(`
            SELECT s.id_lote, SUM(s.cantidad) AS n
            FROM stock_ubicacion_lote s JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0 AND u.tarima_ub IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM detalle_inventario d JOIN inventario i ON i.id_inventario = d.id_inventario
                              WHERE i.status = 'APLICADO' AND d.contado AND d.id_ubicacion_sucursal = s.id_ubicacion_sucursal AND d.id_lote = s.id_lote)
            GROUP BY s.id_lote`, rep),
        dbLocal.query<any>(`
            SELECT id_articulo, SUM(cantidad_movimiento) AS n FROM kardex_movimientos_articulos
            WHERE id_lote IS NULL AND tipo_movimiento = 'ENTRADA' AND id_empresa = :emp GROUP BY id_articulo`, rep),
    ]);

    const stockPor = new Map<string, { e: number; ap: number }>(stock.map((r: any) => [r.id_lote, { e: num(r.e), ap: num(r.ap) }]));
    const tarimaPor = new Map<string, number>(tarimas.map((r: any) => [r.id_lote, num(r.n)]));
    const sinLotePor = new Map<string, number>(sinLote.map((r: any) => [r.id_articulo, num(r.n)]));
    const iniPor = new Map<string, Array<{ f: number; c: number }>>();
    for (const r of inis) {
        const l = iniPor.get(r.id_lote) ?? [];
        l.push({ f: +new Date(r.fecha), c: num(r.c ?? r.cantidad) });
        iniPor.set(r.id_lote, l);
    }
    const movPor = new Map<string, Array<{ f: number; t: string; c: number }>>();
    for (const r of movs) {
        const l = movPor.get(r.id_lote) ?? [];
        l.push({ f: +new Date(r.fecha), t: r.t, c: num(r.c) });
        movPor.set(r.id_lote, l);
    }
    const entra = (t: string) => t === 'AJUSTE_ENTRADA' || t === 'ENTRADA';

    const out: ILoteCuadre[] = [];
    for (const l of lotes) {
        const s = stockPor.get(l.id) ?? { e: 0, ap: 0 };
        const ini = iniPor.get(l.id);
        const ms = movPor.get(l.id) ?? [];
        if (!ini && s.e === 0 && ms.length === 0) continue;   // sin existencia ni historia: no aporta

        const tarima = tarimaPor.get(l.id) ?? 0;
        const entSL = sinLotePor.get(l.id_artic) ?? 0;
        let base: number | null = null, fecha_conteo: string | null = null;
        let entradas = 0, ventas = 0, otras = 0;
        let esperada: number | null = null;
        let origen: ILoteCuadre['origen'] = 'NINGUNO';
        let ultimaVenta = 0;
        for (const m of ms) if (m.t === 'VENTA' && m.f > ultimaVenta) ultimaVenta = m.f;

        if (ini) {
            const ult = Math.max(...ini.map(x => x.f));
            base = ini.filter(x => x.f === ult).reduce((a, x) => a + x.c, 0);
            fecha_conteo = new Date(ult).toISOString().slice(0, 10);
            for (const m of ms) {
                if (m.f <= ult) continue;
                if (m.t === 'VENTA') ventas += m.c;
                else if (entra(m.t)) entradas += m.c;
                else otras += m.c;
            }
            esperada = base + entradas - ventas - otras + tarima;
            origen = 'CONTEO';
        } else if (ms.some(m => m.t === 'ENTRADA')) {
            for (const m of ms) {
                if (m.t === 'VENTA') ventas += m.c;
                else if (entra(m.t)) entradas += m.c;
                else otras += m.c;
            }
            esperada = entradas - ventas - otras;
            origen = 'KARDEX';
        }

        // Sin existencia y sin forma de verificarlo (lotes viejos ya agotados): no hay nada que vigilar
        if (esperada === null && s.e === 0) continue;

        let estado: EstadoCuadre;
        if (esperada === null) estado = 'NO_VERIFICABLE';
        else if (s.e - esperada === 0) estado = 'CUADRA';
        else if (esperada < 0 || entSL > 0) estado = 'EXPLICABLE';
        else estado = 'CONTAR';

        out.push({
            id_lote: l.id, cod_int_artic: l.cod, articulo: l.art, numero_lote: l.lote, caducidad: dia(l.cad),
            sistema: s.e, apartada: s.ap, base, fecha_conteo, entradas, ventas, otras_salidas: otras,
            tarima_sin_inventariar: base !== null ? tarima : 0, esperada, diferencia: esperada === null ? null : s.e - esperada,
            estado, entradas_sin_lote_articulo: entSL, origen, ultima_venta: ultimaVenta ? new Date(ultimaVenta).toISOString().slice(0, 10) : null,
        });
    }
    out.sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
        || Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0) || String(a.articulo).localeCompare(String(b.articulo)));
    cache.set(id_empresa, { t: Date.now(), lotes: out });
    return out;
}

async function apartadasSinPedido(id_empresa: string) {
    const [r] = await dbLocal.query<any>(`
        SELECT COUNT(*) AS lotes, COALESCE(SUM(x.ap - x.resp), 0) AS piezas FROM (
            SELECT s.id_lote, SUM(s.cantidad_apartada) AS ap,
                   COALESCE((SELECT SUM(dpal.cantidad) FROM detalle_pedido_almacen_lote dpal
                             JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
                             JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
                             WHERE dpal.id_lote_sucursal = s.id_lote AND pa.status_pedido_alm IN ('SU', 'CH', 'EM') AND pa.fecha_facturado_pedido_alm IS NULL), 0) AS resp
            FROM stock_ubicacion_lote s WHERE s.id_empresa_sucursal = :emp AND COALESCE(s.cantidad_apartada, 0) > 0 GROUP BY s.id_lote
        ) x WHERE x.ap > x.resp`, { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
    return { lotes: num(r?.lotes), piezas: num(r?.piezas) };
}

export const CuadreExistenciasService = {

    getResumen: async (id_empresa: string, forzar = false) => {
        const lotes = await calcular(id_empresa, forzar);

        const por: Record<EstadoCuadre, { lotes: number; piezas: number }> = {
            CUADRA: { lotes: 0, piezas: 0 }, CONTAR: { lotes: 0, piezas: 0 }, EXPLICABLE: { lotes: 0, piezas: 0 }, NO_VERIFICABLE: { lotes: 0, piezas: 0 },
        };
        let esperadaTotal = 0, sistemaTotal = 0;
        for (const l of lotes) {
            por[l.estado].lotes++; por[l.estado].piezas += l.sistema;
            sistemaTotal += l.sistema;
            // Solo cuentan como "esperada" los lotes concluyentes; en los demás se toma lo que dice el sistema
            esperadaTotal += (l.estado === 'CUADRA' || l.estado === 'CONTAR') && l.esperada !== null ? l.esperada : l.sistema;
        }
        const contar = lotes.filter(l => l.estado === 'CONTAR');
        const piezasContar = contar.reduce((s, l) => s + Math.abs(l.diferencia ?? 0), 0);

        const [apartadas, pendientes, recientes] = await Promise.all([
            apartadasSinPedido(id_empresa),
            Cuadre_Alerta.count({ where: { id_empresa_sucursal: id_empresa, atendida: false } }),
            dbLocal.query<any>(`
                SELECT c.id_cuadre_alerta, c.cod_pedido, c.facturado, c.descontado, c.faltante, c.atendida, c."createdAt" AS creada,
                       a.cod_int_artic, TRIM(a.des_artic) AS articulo, TRIM(l.numero_lote_sucursal) AS lote, c.id_lote
                FROM cuadre_alerta c
                JOIN articulo a ON a.id_artic = c.id_articulo
                JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = c.id_lote
                WHERE c.id_empresa_sucursal = :emp
                ORDER BY c.atendida ASC, c."createdAt" DESC LIMIT 30`,
                { replacements: { emp: id_empresa }, type: QueryTypes.SELECT }),
        ]);

        // Foto del día para la tendencia (una por día y sucursal)
        try {
            await Cuadre_Snapshot.upsert({
                id_empresa_sucursal: id_empresa, fecha: new Date().toISOString().slice(0, 10),
                lotes_contar: por.CONTAR.lotes, piezas_contar: piezasContar, lotes_explicables: por.EXPLICABLE.lotes,
                lotes_cuadran: por.CUADRA.lotes, apartadas_sin_pedido: apartadas.piezas, alertas_pendientes: pendientes,
            } as any);
        } catch (e: any) { console.warn('[Cuadre] no se pudo guardar la foto del día:', e?.message); }
        const tendencia = await dbLocal.query<any>(`
            SELECT fecha, lotes_contar, piezas_contar, lotes_explicables, lotes_cuadran, apartadas_sin_pedido, alertas_pendientes
            FROM cuadre_snapshot WHERE id_empresa_sucursal = :emp ORDER BY fecha DESC LIMIT 30`,
            { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });

        return {
            generado: new Date().toISOString(),
            totales: {
                lotes: lotes.length, piezas_sistema: sistemaTotal, piezas_esperadas: esperadaTotal, diferencia: sistemaTotal - esperadaTotal,
                piezas_por_contar: piezasContar,
            },
            por_estado: por,
            apartadas_sin_pedido: apartadas,
            alertas: { pendientes, recientes: recientes.map((r: any) => ({ ...r, facturado: num(r.facturado), descontado: num(r.descontado), faltante: num(r.faltante) })) },
            tendencia: tendencia.map((t: any) => ({ ...t, fecha: dia(t.fecha) })).reverse(),
            // Solo los lotes que no cuadran (los que cuadran son miles y no hace falta mandarlos)
            lotes: lotes.filter(l => l.estado !== 'CUADRA'),
        };
    },

    // Todo lo que explica el número de un lote: dónde está, qué se contó y cada movimiento después
    getLote: async (id_empresa: string, id_lote: string) => {
        const lotes = await calcular(id_empresa);
        const lote = lotes.find(l => l.id_lote === id_lote);
        if (!lote) throw new Error('No se encontró el lote.');

        const ubic = await dbLocal.query<any>(`
            SELECT s.cantidad, COALESCE(s.cantidad_apartada, 0) AS apartada, s.id_ubicacion_sucursal,
                   u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub,
                   EXISTS (SELECT 1 FROM detalle_inventario d JOIN inventario i ON i.id_inventario = d.id_inventario
                           WHERE i.status = 'APLICADO' AND d.contado AND d.id_ubicacion_sucursal = s.id_ubicacion_sucursal AND d.id_lote = s.id_lote) AS inventariada
            FROM stock_ubicacion_lote s LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :emp AND s.id_lote = :lote AND (s.cantidad > 0 OR s.cantidad_apartada > 0)
            ORDER BY s.cantidad DESC`, { replacements: { emp: id_empresa, lote: id_lote }, type: QueryTypes.SELECT });

        const movs = await dbLocal.query<any>(`
            SELECT * FROM (
                SELECT m.fecha, m.tipo_movimiento::text AS tipo, m.cantidad AS cantidad, COALESCE(m.notas, '') AS notas, 'Ajuste / conteo' AS origen
                FROM movimiento_articulo m WHERE m.id_empresa = :emp AND m.id_lote = :lote
                UNION ALL
                SELECT k.fecha, k.tipo_movimiento::text, k.cantidad_movimiento, COALESCE(k.notas, ''), 'Kardex'
                FROM kardex_movimientos_articulos k WHERE k.id_empresa = :emp AND k.id_lote = :lote
            ) x ORDER BY fecha DESC LIMIT 150`, { replacements: { emp: id_empresa, lote: id_lote }, type: QueryTypes.SELECT });

        const alertas = await dbLocal.query<any>(`
            SELECT cod_pedido, facturado, descontado, faltante, atendida, "createdAt" AS creada FROM cuadre_alerta
            WHERE id_empresa_sucursal = :emp AND id_lote = :lote ORDER BY "createdAt" DESC LIMIT 20`,
            { replacements: { emp: id_empresa, lote: id_lote }, type: QueryTypes.SELECT });

        return {
            lote,
            ubicaciones: ubic.map((u: any) => ({
                ubicacion: u.id_ubicacion_sucursal ? etiquetaUbicacion(u) : 'Sin ubicación',
                es_tarima: !!u.tarima_ub, cantidad: num(u.cantidad), apartada: num(u.apartada), inventariada: !!u.inventariada,
            })),
            movimientos: movs.map((m: any) => ({ fecha: new Date(m.fecha).toISOString(), tipo: m.tipo, cantidad: num(m.cantidad), notas: String(m.notas).trim(), origen: m.origen })),
            alertas: alertas.map((a: any) => ({ ...a, facturado: num(a.facturado), descontado: num(a.descontado), faltante: num(a.faltante) })),
        };
    },

    atenderAlerta: async (id_empresa: string, id_alerta: string, id_empleado: string | null) => {
        const a = await Cuadre_Alerta.findOne({ where: { id_cuadre_alerta: id_alerta, id_empresa_sucursal: id_empresa } });
        if (!a) throw new Error('No se encontró el aviso.');
        await a.update({ atendida: true, atendida_en: new Date(), atendida_por: id_empleado });
        return { ok: true };
    },

    // Excel con los lotes que no cuadran (hoja 1) y todos los lotes (hoja 2), con una columna para anotar el conteo físico
    generarExcel: async (id_empresa: string): Promise<Buffer> => {
        const lotes = await calcular(id_empresa, true);
        const ESTADO: Record<EstadoCuadre, string> = {
            CUADRA: 'Cuadra', CONTAR: 'Diferencia · CONTAR', EXPLICABLE: 'Diferencia · explicable por entradas sin lote', NO_VERIFICABLE: 'No verificable',
        };
        const fila = (l: ILoteCuadre) => ({
            'Estado': ESTADO[l.estado], 'Código': l.cod_int_artic, 'Artículo': l.articulo, 'Lote': l.numero_lote, 'Caducidad': l.caducidad ?? '',
            'Existencia sistema': l.sistema, 'Apartada': l.apartada, 'Conteo base (inventario)': l.base ?? '', 'Fecha del conteo': l.fecha_conteo ?? '',
            'Entradas desde el conteo': l.origen === 'NINGUNO' ? '' : l.entradas, 'Ventas': l.origen === 'NINGUNO' ? '' : l.ventas,
            'Otras salidas': l.origen === 'NINGUNO' ? '' : l.otras_salidas, 'Tarima sin inventariar': l.tarima_sin_inventariar || '',
            'EXISTENCIA ESPERADA': l.esperada ?? '', 'Dif. sistema − esperada': l.diferencia ?? '', 'Entradas sin lote del artículo': l.entradas_sin_lote_articulo || '',
            'Última venta': l.ultima_venta ?? '', 'CONTEO FÍSICO': '', 'Notas': '',
        });
        const wb = XLSX.utils.book_new();
        const anchos = [26, 8, 40, 14, 11, 11, 9, 12, 12, 11, 9, 10, 11, 12, 12, 12, 12, 12, 24].map(wch => ({ wch }));
        const hoja = (rows: any[]) => { const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = anchos; ws['!freeze'] = { xSplit: 0, ySplit: 1 } as any; return ws; };
        XLSX.utils.book_append_sheet(wb, hoja(lotes.filter(l => l.estado !== 'CUADRA').map(fila)), 'Por revisar');
        XLSX.utils.book_append_sheet(wb, hoja(lotes.map(fila)), 'Todos los lotes');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    },
};

/**
 * Registra un aviso cuando, al facturar, el lote no tenía existencia suficiente para descontar todo lo facturado.
 * Se manda a guardar cuando la transacción de la factura termina bien (si se revierte, no queda aviso falso).
 */
export function programarAlertaFaltante(
    t: { afterCommit: (fn: () => any) => void },
    datos: { id_empresa_sucursal: string; id_pedido_alm: string; id_articulo: string; id_lote: string; facturado: number; descontado: number; faltante: number },
) {
    t.afterCommit(async () => {
        try {
            const [p] = await dbLocal.query<any>(`SELECT cod_int_pedido_alm FROM pedido_almacen WHERE id_pedido_alm = :id`,
                { replacements: { id: datos.id_pedido_alm }, type: QueryTypes.SELECT });
            await Cuadre_Alerta.create({
                ...datos, cod_pedido: p ? String(p.cod_int_pedido_alm).trim() : null, tipo: 'FALTANTE_AL_FACTURAR',
            } as any);
        } catch (e: any) {
            console.warn('[Cuadre] no se pudo guardar el aviso de faltante:', e?.message);
        }
    });
}
