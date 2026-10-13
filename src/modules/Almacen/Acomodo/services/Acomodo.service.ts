import { v4 as uuidv4 } from "uuid";
import { Transaction, QueryTypes } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import Kardex_Movimientos_Articulos from "../../Kardex/model/Kardex_Movimientos_Articulos";

type LineaAcomodo = { ubicacion_id: string; cantidad: number };

const toInt = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
const etiquetaUbicacion = (u: any) => u.tipo_ubicacion === 'TARIMA'
    ? `Tarima ${String(u.tarima_ub ?? '').trim()}`
    : [u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-');

// Deja en el Kardex el movimiento de acomodo (sin ubicar → ubicación): quién, cuándo, artículo, lote y destino.
// Es un TRASLADO interno: NO cambia la existencia total (el Kardex ya trata así a los traslados).
// La nota lleva de dónde venía la mercancía (compra, devolución, cancelación) para poder medir el acomodo
// de compras por separado: "Acomodo · compra · Sin ubicar → B-1-3-7".
async function registrarAcomodoKardex(t: Transaction, p: {
    id_empresa: string;
    id_articulo: string;
    id_lote: string;
    id_empleado?: string | null;
    documento_ref?: string | null;
    destinos: { id_ubicacion: string; etiqueta?: string; cantidad: number }[];
}) {
    // Origen según la última entrada que tuvo ese artículo y lote
    const ult = await dbLocal.query<any>(`
        SELECT notas FROM kardex_movimientos_articulos
        WHERE id_empresa = :emp AND id_articulo = :art AND id_lote = :lote AND tipo_movimiento = 'ENTRADA'
        ORDER BY fecha DESC LIMIT 1
    `, { replacements: { emp: p.id_empresa, art: p.id_articulo, lote: p.id_lote }, type: QueryTypes.SELECT, transaction: t }) as any[];
    const nota = String(ult[0]?.notas ?? '');
    const origen = /^Recepci/i.test(nota) ? 'compra'
        : /^Devoluci/i.test(nota) ? 'devolución'
        : /^Cancelaci/i.test(nota) ? 'cancelación'
        : 'otro';

    // Etiqueta de los destinos que no la traen
    const faltan = p.destinos.filter(d => !d.etiqueta).map(d => d.id_ubicacion);
    const etiquetas = new Map<string, string>();
    if (faltan.length) {
        const us = await dbLocal.query<any>(`
            SELECT id_ubicacion_sucursal, tipo_ubicacion, tarima_ub, pasillo_ub, anaquel_ub, nivel_ub, posicion_ub
            FROM ubicacion_sucursal WHERE id_ubicacion_sucursal IN (:ids)
        `, { replacements: { ids: faltan }, type: QueryTypes.SELECT, transaction: t }) as any[];
        for (const u of us) etiquetas.set(String(u.id_ubicacion_sucursal), etiquetaUbicacion(u));
    }

    const ahora = new Date();
    await Kardex_Movimientos_Articulos.bulkCreate(p.destinos.map(d => ({
        id_kardex_movimientos: uuidv4(),
        id_empresa: p.id_empresa,
        fecha: ahora,
        id_articulo: p.id_articulo,
        id_lote: p.id_lote,
        tipo_movimiento: 'TRASLADO' as const,
        categoria: 'Movimiento_Interno' as const,
        id_origen_ubicacion: null,
        id_destino_ubicacion: d.id_ubicacion,
        cantidad_movimiento: d.cantidad,
        documento_ref: p.documento_ref ?? null,
        id_pedido: null,
        id_empleado: p.id_empleado ?? null,
        notas: `Acomodo · ${origen} · Sin ubicar → ${d.etiqueta ?? etiquetas.get(d.id_ubicacion) ?? 'ubicación'}`,
    } as any)), { transaction: t });
}

// Ubicación default de cada artículo para acomodar: el anaquel/estantería primero (es su lugar de picking) y, si solo
// tiene tarima default, la tarima.
async function destinosDefault(id_empresa_sucursal: string, idsArticulos: string[], t?: Transaction) {
    const mapa = new Map<string, { id_ubicacion: string; etiqueta: string; tipo: string }>();
    if (!idsArticulos.length) return mapa;
    const filas = await dbLocal.query<any>(`
        SELECT d.id_articulo, d.id_ubicacion_default AS id_ubicacion,
               u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub
        FROM articulo_ubicacion_default d
        JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = d.id_ubicacion_default
        WHERE d.id_empresa_sucursal = :emp AND d.id_articulo IN (:ids) AND u.activo IS NOT FALSE
        ORDER BY (u.tipo_ubicacion = 'TARIMA') ASC
    `, { replacements: { emp: id_empresa_sucursal, ids: idsArticulos }, type: QueryTypes.SELECT, transaction: t }) as any[];
    for (const f of filas) {
        if (mapa.has(f.id_articulo)) continue;   // ya quedó la estantería (va primero por el ORDER BY)
        mapa.set(f.id_articulo, { id_ubicacion: f.id_ubicacion, etiqueta: etiquetaUbicacion(f), tipo: f.tipo_ubicacion });
    }
    return mapa;
}

// Ubicación con MÁS existencia de cada lote (es de donde el sistema descontaba al facturar cuando no había apartado)
async function destinosMayorExistencia(id_empresa_sucursal: string, idsLotes: string[], t?: Transaction) {
    const mapa = new Map<string, { id_ubicacion: string; etiqueta: string; tipo: string; cantidad: number }>();
    if (!idsLotes.length) return mapa;
    const filas = await dbLocal.query<any>(`
        SELECT DISTINCT ON (s.id_lote) s.id_lote, s.id_ubicacion_sucursal AS id_ubicacion, s.cantidad,
               u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub
        FROM stock_ubicacion_lote s
        JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
        WHERE s.id_empresa_sucursal = :emp AND s.id_lote IN (:ids) AND s.id_ubicacion_sucursal IS NOT NULL AND s.cantidad > 0
        ORDER BY s.id_lote, s.cantidad DESC
    `, { replacements: { emp: id_empresa_sucursal, ids: idsLotes }, type: QueryTypes.SELECT, transaction: t }) as any[];
    for (const f of filas) {
        mapa.set(String(f.id_lote), {
            id_ubicacion: f.id_ubicacion, etiqueta: etiquetaUbicacion(f), tipo: f.tipo_ubicacion, cantidad: Number(f.cantidad) || 0,
        });
    }
    return mapa;
}

export const AcomodoServices = {
    // Todo lo que está SIN UBICACIÓN, con la ubicación default del artículo a la que se acomodaría
    pendientesConDefault: async (id_empresa_sucursal: string) => {
        const filas = await dbLocal.query<any>(`
            SELECT s.id_stock_ubicacion_lote, s.id_articulo, s.id_lote, s.cantidad, COALESCE(s.cantidad_apartada, 0) AS apartada,
                   a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                   l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
            FROM stock_ubicacion_lote s
            JOIN articulo a ON a.id_artic = s.id_articulo
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            WHERE s.id_empresa_sucursal = :emp AND s.id_ubicacion_sucursal IS NULL AND s.cantidad > 0
            ORDER BY a.des_artic ASC, l.fecha_venci_lote_sucursal ASC NULLS LAST
        `, { replacements: { emp: id_empresa_sucursal }, type: QueryTypes.SELECT }) as any[];

        // Origen: lo que entró a ese artículo y lote en los últimos 120 días según el Kardex
        const origenes = await dbLocal.query<any>(`
            SELECT k.id_articulo, k.id_lote,
                   COALESCE(SUM(CASE WHEN k.notas ILIKE 'Devolución recibida%' THEN k.cantidad_movimiento ELSE 0 END), 0) AS devolucion,
                   STRING_AGG(DISTINCT CASE WHEN k.notas ILIKE 'Devolución recibida%' THEN regexp_replace(k.notas, '^.*Factura\\s+', '') END, ', ') AS facturas_devolucion,
                   COALESCE(SUM(CASE WHEN k.notas ILIKE 'Cancelación de factura%' THEN k.cantidad_movimiento ELSE 0 END), 0) AS cancelacion,
                   STRING_AGG(DISTINCT CASE WHEN k.notas ILIKE 'Cancelación de factura%' THEN substring(k.notas from 'Pedido ([^ ]+)') END, ', ') AS pedidos_cancelacion,
                   COALESCE(SUM(CASE WHEN k.notas ILIKE 'Recepci%' THEN k.cantidad_movimiento ELSE 0 END), 0) AS recibo
            FROM kardex_movimientos_articulos k
            WHERE k.id_empresa = :emp AND k.tipo_movimiento = 'ENTRADA' AND k.fecha >= NOW() - INTERVAL '120 days'
              AND (k.id_articulo, k.id_lote) IN (
                    SELECT s.id_articulo, s.id_lote FROM stock_ubicacion_lote s
                    WHERE s.id_empresa_sucursal = :emp AND s.id_ubicacion_sucursal IS NULL AND s.cantidad > 0 AND s.id_lote IS NOT NULL)
            GROUP BY k.id_articulo, k.id_lote
        `, { replacements: { emp: id_empresa_sucursal }, type: QueryTypes.SELECT }) as any[];
        const origenPorLote = new Map<string, any>(origenes.map(o => [`${o.id_articulo}|${o.id_lote}`, o]));

        const destinos = await destinosDefault(id_empresa_sucursal, Array.from(new Set(filas.map(f => String(f.id_articulo)))));
        const mayores = await destinosMayorExistencia(id_empresa_sucursal, Array.from(new Set(filas.map(f => String(f.id_lote)).filter(Boolean))));
        const items = filas.map(f => {
            const d = destinos.get(String(f.id_articulo));
            const m = f.id_lote ? mayores.get(String(f.id_lote)) : undefined;
            const o = origenPorLote.get(`${f.id_articulo}|${f.id_lote}`);
            const origen: { tipo: 'DEVOLUCION' | 'CANCELACION' | 'RECIBO'; cantidad: number; detalle: string }[] = [];
            if (o && Number(o.devolucion) > 0) origen.push({ tipo: 'DEVOLUCION', cantidad: Number(o.devolucion), detalle: String(o.facturas_devolucion ?? '').trim() });
            if (o && Number(o.cancelacion) > 0) origen.push({ tipo: 'CANCELACION', cantidad: Number(o.cancelacion), detalle: String(o.pedidos_cancelacion ?? '').trim() });
            if (o && Number(o.recibo) > 0) origen.push({ tipo: 'RECIBO', cantidad: Number(o.recibo), detalle: '' });
            return {
                id_stock_ubicacion_lote: f.id_stock_ubicacion_lote as string,
                id_articulo: f.id_articulo as string,
                cod_int_artic: f.cod_int_artic as number,
                des_artic: String(f.des_artic ?? '').trim(),
                cod_barr_artic: String(f.cod_barr_artic ?? '').trim(),
                numero_lote: String(f.numero_lote_sucursal ?? '').trim(),
                caducidad: f.fecha_venci_lote_sucursal ?? null,
                cantidad: Number(f.cantidad) || 0,
                apartada: Number(f.apartada) || 0,
                destino: d ? { id_ubicacion: d.id_ubicacion, etiqueta: d.etiqueta, tipo: d.tipo } : null,
                // Donde hay más existencia de ESE lote (de ahí se descuenta al facturar sin apartado)
                destino_mayor: m ? { id_ubicacion: m.id_ubicacion, etiqueta: m.etiqueta, tipo: m.tipo, cantidad: m.cantidad } : null,
                // De dónde pudo venir (Kardex, últimos 120 días): devolución de cliente, cancelación de factura o recibo
                origen,
            };
        });
        return {
            total: items.length,
            piezas: items.reduce((s, i) => s + i.cantidad, 0),
            con_default: items.filter(i => i.destino).length,
            sin_default: items.filter(i => !i.destino).length,
            items,
        };
    },

    // Acomoda cada renglón sin ubicación en la ubicación default de su artículo (una transacción por renglón: si uno
    // no se puede, los demás sí se acomodan). Se mueve la cantidad completa y su apartado; si ese lote ya está en el
    // destino, se SUMA a la fila existente.
    acomodarEnDefault: async (id_empresa_sucursal: string, ids: string[], modo: 'default' | 'mayor' = 'default', id_empleado?: string) => {
        const unicos = Array.from(new Set((ids ?? []).map(String).filter(Boolean)));
        if (!unicos.length) throw new Error('Indica qué renglones acomodar');

        const resultados: { id_stock_ubicacion_lote: string; ok: boolean; destino?: string; motivo?: string }[] = [];

        for (const id of unicos) {
            try {
                const r = await dbLocal.transaction(async (t) => {
                    const fila = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(id_empresa_sucursal, id, t);
                    if (!fila) throw new Error('El renglón ya no existe');
                    const p = fila.get({ plain: true }) as any;
                    if (p.id_ubicacion_sucursal) throw new Error('Ya está acomodado');
                    if (!p.id_lote) throw new Error('No trae lote');
                    const cantidad = Number(p.cantidad) || 0;
                    if (cantidad <= 0) throw new Error('Sin cantidad');

                    const destinos = await destinosDefault(id_empresa_sucursal, [String(p.id_articulo)], t);
                    let destino: { id_ubicacion: string; etiqueta: string; tipo: string } | undefined = destinos.get(String(p.id_articulo));
                    if (modo === 'mayor') {
                        // Donde hay más existencia de ese mismo lote; si no hay otra ubicación con el lote, la default
                        const mayores = await destinosMayorExistencia(id_empresa_sucursal, [String(p.id_lote)], t);
                        destino = mayores.get(String(p.id_lote)) ?? destino;
                    }
                    if (!destino) throw new Error(modo === 'mayor'
                        ? 'No hay otra ubicación con ese lote ni ubicación default'
                        : 'El artículo no tiene ubicación default');

                    // Un anaquel guarda un solo artículo: si ya tiene otro, no se mezcla
                    if (destino.tipo !== 'TARIMA') {
                        const otros = (await Stock_Ubicacion_LoteRepository.getDistinctArticuloIdsInUbicacion(destino.id_ubicacion, t))
                            .filter(a => String(a) !== String(p.id_articulo));
                        if (otros.length) throw new Error(`${destino.etiqueta} tiene existencia de otro artículo`);
                    }

                    const apartada = Number(p.cantidad_apartada) || 0;
                    const existente = await Stock_Ubicacion_LoteRepository.findMismaUbicacionYLote(
                        id_empresa_sucursal, p.id_articulo, p.id_lote, destino.id_ubicacion, t, id,
                    );
                    if (existente) {
                        await existente.update({
                            cantidad: (Number(existente.cantidad) || 0) + cantidad,
                            cantidad_apartada: (Number(existente.cantidad_apartada) || 0) + apartada,
                        }, { transaction: t });
                        await fila.destroy({ transaction: t });
                    } else {
                        await fila.update({ id_ubicacion_sucursal: destino.id_ubicacion }, { transaction: t });
                    }
                    await registrarAcomodoKardex(t, {
                        id_empresa: id_empresa_sucursal, id_articulo: String(p.id_articulo), id_lote: String(p.id_lote),
                        id_empleado, documento_ref: id,
                        destinos: [{ id_ubicacion: destino.id_ubicacion, etiqueta: destino.etiqueta, cantidad }],
                    });
                    return destino.etiqueta;
                });
                resultados.push({ id_stock_ubicacion_lote: id, ok: true, destino: r });
            } catch (e: any) {
                resultados.push({ id_stock_ubicacion_lote: id, ok: false, motivo: e?.message ?? 'Error' });
            }
        }

        return {
            acomodados: resultados.filter(r => r.ok).length,
            omitidos: resultados.filter(r => !r.ok).length,
            resultados,
        };
    },

    obtenerPendientesAcomodo: async (id_empresa_sucursal: string, cb?: string) => {
        return await Stock_Ubicacion_LoteRepository.findPendientesDeAcomodo(id_empresa_sucursal, cb);
    },

    acomodarArticulo: async (
        id_empresa_sucursal: string,
        payload: { id_stock_ubicacion_lote: string; lineas: LineaAcomodo[]; id_empleado?: string },
        tx?: Transaction
    ) => {
        const id_stock_ubicacion_lote = String(payload?.id_stock_ubicacion_lote || "").trim();
        const lineasRaw = payload?.lineas;

        if (!id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!id_stock_ubicacion_lote) throw new Error("id_stock_ubicacion_lote requerido");
        if (!Array.isArray(lineasRaw) || lineasRaw.length === 0) throw new Error("lineas requeridas");

        // normaliza lineas
        const lineas = lineasRaw
            .map(l => ({
                ubicacion_id: String(l?.ubicacion_id || "").trim(),
                cantidad: toInt(l?.cantidad),
            }))
            .filter(l => l.ubicacion_id);

        if (!lineas.length) throw new Error("lineas inválidas");

        for (const l of lineas) {
            if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) {
                throw new Error(`cantidad inválida para ubicacion ${l.ubicacion_id}`);
            }
        }

        // no duplicadas
        const seen = new Set<string>();
        for (const l of lineas) {
            if (seen.has(l.ubicacion_id)) throw new Error(`ubicacion repetida: ${l.ubicacion_id}`);
            seen.add(l.ubicacion_id);
        }

        const run = async (t: Transaction) => {
            const pendiente = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(
                id_empresa_sucursal,
                id_stock_ubicacion_lote,
                t
            );
            if (!pendiente) throw new Error("No existe stock_ubicacion_lote");

            const p = pendiente.get({ plain: true });

            // Debe estar pendiente (ubicación NULL)
            if (p.id_ubicacion_sucursal) {
                throw new Error("Este registro ya está acomodado (id_ubicacion_sucursal no es NULL)");
            }

            if (!p.id_lote) {
                throw new Error("El registro original no trae id_lote (NULL). Corrige tu data.");
            }

            const cantPendiente = toInt(p.cantidad);
            if (!Number.isInteger(cantPendiente) || cantPendiente <= 0) {
                throw new Error("Cantidad pendiente inválida");
            }

            const suma = lineas.reduce((acc, l) => acc + l.cantidad, 0);

            // Si quieres permitir parcial: cambia a if (suma > cantPendiente) ...
            if (suma !== cantPendiente) {
                throw new Error(`La suma (${suma}) no coincide con la pendiente (${cantPendiente})`);
            }

            const [primera, ...resto] = lineas;

            // Si ese lote ya está en esa ubicación, se SUMA a la fila existente en vez de duplicarla
            const existentePrimera = await Stock_Ubicacion_LoteRepository.findMismaUbicacionYLote(
                id_empresa_sucursal, p.id_articulo, p.id_lote, primera.ubicacion_id, t, id_stock_ubicacion_lote
            );
            let actualizado;
            if (existentePrimera) {
                await existentePrimera.update(
                    { cantidad: (Number(existentePrimera.cantidad) || 0) + primera.cantidad },
                    { transaction: t }
                );
                await pendiente.destroy({ transaction: t });
                actualizado = existentePrimera;
            } else {
                actualizado = await Stock_Ubicacion_LoteRepository.updateUbicacionYCantidad(
                    id_empresa_sucursal,
                    id_stock_ubicacion_lote,
                    { id_ubicacion_sucursal: primera.ubicacion_id, cantidad: primera.cantidad },
                    t
                );
            }

            const creados = [];
            for (const linea of resto) {
                const existente = await Stock_Ubicacion_LoteRepository.findMismaUbicacionYLote(
                    id_empresa_sucursal, p.id_articulo, p.id_lote, linea.ubicacion_id, t
                );
                if (existente) {
                    await existente.update(
                        { cantidad: (Number(existente.cantidad) || 0) + linea.cantidad },
                        { transaction: t }
                    );
                    creados.push(existente.get({ plain: true }));
                    continue;
                }
                const nuevo = await Stock_Ubicacion_LoteRepository.create(
                    {
                        id_empresa_sucursal,
                        id_articulo: p.id_articulo,
                        id_lote: p.id_lote, // ✅ ESTE ES EL FIX
                        id_ubicacion_sucursal: linea.ubicacion_id,
                        cantidad: linea.cantidad,
                        cantidad_apartada: 0,
                    },
                    t
                );
                creados.push(nuevo.get({ plain: true }));
            }

            await registrarAcomodoKardex(t, {
                id_empresa: id_empresa_sucursal, id_articulo: String(p.id_articulo), id_lote: String(p.id_lote),
                id_empleado: payload?.id_empleado, documento_ref: id_stock_ubicacion_lote,
                destinos: lineas.map(l => ({ id_ubicacion: l.ubicacion_id, cantidad: l.cantidad })),
            });

            return {
                actualizado: actualizado?.get({ plain: true }) ?? null,
                creados,
                total_lineas: lineas.length,
                suma,
            };
        };

        if (tx) return run(tx);
        return dbLocal.transaction(run);
    },

};
