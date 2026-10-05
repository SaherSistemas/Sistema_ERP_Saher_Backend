import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Artículos del catálogo que NO tienen existencia en esta empresa (la otra mitad de la tarjeta "Artículos con existencia").
// Incluye cuándo fue la última salida por facturación, para distinguir los que se mueven de los que ya no se usan.
export const SinExistenciaService = {

    getLista: async (id_empresa: string, opts: { page: number; limite: number; q: string; orden: 'venta' | 'nombre' }) => {
        const { page, limite, q, orden } = opts;
        const busqueda = q.trim();
        const filtro = busqueda
            ? `AND (a.des_artic ILIKE :like OR a.cod_barr_artic ILIKE :like ${/^\d+$/.test(busqueda) ? 'OR a.cod_int_artic = :cod' : ''})`
            : '';
        const rep: Record<string, any> = { emp: id_empresa, limite, offset: (page - 1) * limite };
        if (busqueda) {
            rep.like = `%${busqueda}%`;
            if (/^\d+$/.test(busqueda)) rep.cod = Number(busqueda);
        }

        const desde = `
            FROM articulo a
            LEFT JOIN (
                SELECT id_articulo, MAX(fecha) AS ultima_venta
                FROM kardex_movimientos_articulos
                WHERE id_empresa = :emp AND tipo_movimiento = 'VENTA'
                GROUP BY id_articulo
            ) kv ON kv.id_articulo = a.id_artic
            WHERE a.cod_int_artic IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM stock_ubicacion_lote s
                  WHERE s.id_articulo = a.id_artic AND s.id_empresa_sucursal = :emp AND s.cantidad > 0
              )
              ${filtro}
        `;
        const orderBy = orden === 'nombre' ? 'a.des_artic ASC' : 'kv.ultima_venta DESC NULLS LAST, a.des_artic ASC';

        const [filas, [total]] = await Promise.all([
            dbLocal.query<any>(`
                SELECT a.cod_int_artic, a.des_artic, a.cod_barr_artic, kv.ultima_venta::date::text AS ultima_venta
                ${desde}
                ORDER BY ${orderBy}
                LIMIT :limite OFFSET :offset
            `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            dbLocal.query<any>(`SELECT COUNT(*) AS total ${desde}`, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
        ]);

        const totalArticulos = num(total?.total);
        return {
            page,
            limite,
            total_articulos: totalArticulos,
            total_paginas: Math.max(1, Math.ceil(totalArticulos / limite)),
            articulos: filas.map(r => ({
                cod_int_artic: r.cod_int_artic as number,
                des_artic: r.des_artic as string,
                cod_barr_artic: (r.cod_barr_artic ?? '') as string,
                ultima_venta: (r.ultima_venta ?? null) as string | null,
            })),
        };
    },
};
