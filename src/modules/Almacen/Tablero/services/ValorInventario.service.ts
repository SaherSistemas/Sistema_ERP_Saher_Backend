import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { patronBusqueda } from '../../../../utils/busqueda';

const num = (v: unknown) => Number(v ?? 0) || 0;

export type OrdenValor = 'valor' | 'existencia' | 'nombre';

const ORDEN_SQL: Record<OrdenValor, string> = {
    valor: 'valor DESC, a.des_artic ASC',
    existencia: 'existencia DESC, a.des_artic ASC',
    nombre: 'a.des_artic ASC',
};

// Existencia y valor al costo por artículo (una fila por artículo, sumando todos sus lotes y ubicaciones).
// El valor sale del costo capturado en cada lote; un lote sin costo suma 0 y se marca en lotes_sin_costo.
export const ValorInventarioService = {

    // Lotes con existencia de un artículo (por código interno) con su costo, para poder corregirlo
    getLotes: async (id_empresa: string, cod_int_artic: number) => {
        const filas = await dbLocal.query<any>(`
            SELECT l.id_lote_sucursal, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                   COALESCE(l.precio_costo_lote_sucursal, 0) AS costo,
                   SUM(s.cantidad) AS existencia, COALESCE(SUM(s.cantidad_apartada), 0) AS apartada,
                   a.des_artic
            FROM stock_ubicacion_lote s
            JOIN articulo a ON a.id_artic = s.id_articulo
            JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0 AND a.cod_int_artic = :cod
            GROUP BY l.id_lote_sucursal, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal, l.precio_costo_lote_sucursal, a.des_artic
            ORDER BY l.fecha_venci_lote_sucursal ASC NULLS LAST, l.numero_lote_sucursal`,
            { replacements: { emp: id_empresa, cod: cod_int_artic }, type: QueryTypes.SELECT });
        return filas.map(r => ({
            id_lote: r.id_lote_sucursal as string,
            numero_lote: String(r.numero_lote_sucursal ?? ''),
            caducidad: r.fecha_venci_lote_sucursal ?? null,
            costo: +num(r.costo).toFixed(2),
            existencia: num(r.existencia),
            apartada: num(r.apartada),
            des_artic: String(r.des_artic ?? '').trim(),
        }));
    },

    // Corrige el costo de un lote (solo de lotes de la empresa del usuario)
    actualizarCostoLote: async (id_empresa: string, id_lote: string, costo: number, usuario: string) => {
        if (!Number.isFinite(costo) || costo < 0) throw Object.assign(new Error('El costo debe ser un número mayor o igual a 0.'), { status: 400 });
        const [, meta] = await dbLocal.query(
            `UPDATE lote_articulo_sucursal SET precio_costo_lote_sucursal = :costo
             WHERE id_lote_sucursal = :lote AND id_empre = :emp`,
            { replacements: { costo: +costo.toFixed(2), lote: id_lote, emp: id_empresa } }) as any;
        if (!(meta?.rowCount > 0)) throw Object.assign(new Error('Lote no encontrado.'), { status: 404 });
        console.log(`[CostoLote] ${usuario} cambió el costo del lote ${id_lote} a ${costo.toFixed(2)}`);
        return { ok: true, costo: +costo.toFixed(2) };
    },

    getLista: async (id_empresa: string, opts: { page: number; limit: number; q: string; orden: OrdenValor }) => {
        const { page, limit, q, orden } = opts;
        const offset = (page - 1) * limit;

        const busqueda = q.trim();
        const filtro = busqueda
            ? `AND (a.des_artic ILIKE :like OR a.cod_barr_artic ILIKE :like ${/^\d+$/.test(busqueda) ? 'OR a.cod_int_artic = :cod' : ''})`
            : '';
        const rep: Record<string, any> = { emp: id_empresa, limit, offset };
        if (busqueda) {
            rep.like = patronBusqueda(busqueda);
            if (/^\d+$/.test(busqueda)) rep.cod = Number(busqueda);
        }

        const desde = `
            FROM stock_ubicacion_lote s
            JOIN articulo a ON a.id_artic = s.id_articulo
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0 ${filtro}
        `;

        const [filas, totales] = await Promise.all([
            dbLocal.query<any>(`
                SELECT a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                       SUM(s.cantidad)                                          AS existencia,
                       COALESCE(SUM(s.cantidad_apartada), 0)                    AS apartada,
                       SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)) AS valor,
                       COUNT(DISTINCT s.id_lote)                                AS lotes,
                       COUNT(DISTINCT s.id_lote) FILTER (WHERE COALESCE(l.precio_costo_lote_sucursal, 0) = 0) AS lotes_sin_costo
                ${desde}
                GROUP BY a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic
                ORDER BY ${ORDEN_SQL[orden] ?? ORDEN_SQL.valor}
                LIMIT :limit OFFSET :offset
            `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            dbLocal.query<any>(`
                SELECT COUNT(DISTINCT a.id_artic)                                   AS articulos,
                       COALESCE(SUM(s.cantidad), 0)                                  AS existencia,
                       COALESCE(SUM(s.cantidad_apartada), 0)                         AS apartada,
                       COALESCE(SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)), 0) AS valor
                ${desde}
            `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
        ]);

        const t = totales[0] ?? {};
        const totalArticulos = num(t.articulos);

        return {
            page,
            limit,
            total_articulos: totalArticulos,
            total_paginas: Math.max(1, Math.ceil(totalArticulos / limit)),
            totales: {
                existencia: num(t.existencia),
                apartada: num(t.apartada),
                valor: +num(t.valor).toFixed(2),
            },
            articulos: filas.map(r => {
                const existencia = num(r.existencia);
                const valor = num(r.valor);
                return {
                    cod_int_artic: r.cod_int_artic,
                    des_artic: r.des_artic,
                    cod_barr_artic: r.cod_barr_artic ?? '',
                    existencia,
                    apartada: num(r.apartada),
                    disponible: Math.max(0, existencia - num(r.apartada)),
                    costo_promedio: existencia > 0 ? +(valor / existencia).toFixed(2) : 0,
                    valor: +valor.toFixed(2),
                    lotes: num(r.lotes),
                    lotes_sin_costo: num(r.lotes_sin_costo),
                };
            }),
        };
    },
};
