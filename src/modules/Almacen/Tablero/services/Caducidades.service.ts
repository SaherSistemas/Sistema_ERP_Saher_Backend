import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

export type RangoCaducidad = 'caducadas' | '30' | '90' | '180';

// Mismos rangos que las tarjetas del tablero (no se traslapan):
//   caducadas → ya pasó la fecha · 30 → hoy a 29 días · 90 → 30 a 89 días · 180 → 90 a 179 días
const FILTRO_RANGO: Record<RangoCaducidad, string> = {
    caducadas: `l.fecha_venci_lote_sucursal < CURRENT_DATE`,
    '30': `l.fecha_venci_lote_sucursal >= CURRENT_DATE AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 30`,
    '90': `l.fecha_venci_lote_sucursal >= CURRENT_DATE + 30 AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 90`,
    '180': `l.fecha_venci_lote_sucursal >= CURRENT_DATE + 90 AND l.fecha_venci_lote_sucursal < CURRENT_DATE + 180`,
};

export const CaducidadesService = {

    getLista: async (id_empresa: string, rango: RangoCaducidad, page: number, limite: number) => {
        const filtro = FILTRO_RANGO[rango];
        const rep = { emp: id_empresa, limite, offset: (page - 1) * limite };

        const desde = `
            FROM stock_ubicacion_lote s
            JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            JOIN articulo a ON a.id_artic = s.id_articulo
            LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :emp AND s.cantidad > 0 AND (${filtro})
        `;

        const [filas, totales] = await Promise.all([
            dbLocal.query<any>(`
                SELECT a.cod_int_artic, a.des_artic, l.numero_lote_sucursal AS lote,
                       l.fecha_venci_lote_sucursal::date::text AS caducidad,
                       (l.fecha_venci_lote_sucursal::date - CURRENT_DATE) AS dias,
                       SUM(s.cantidad)                                   AS cantidad,
                       SUM(COALESCE(s.cantidad_apartada, 0))             AS apartada,
                       SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)) AS valor,
                       STRING_AGG(DISTINCT CASE WHEN u.id_ubicacion_sucursal IS NULL THEN NULL
                                                WHEN u.tipo_ubicacion = 'TARIMA' THEN 'Tarima ' || u.tarima_ub
                                                ELSE CONCAT_WS('-', u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub) END, ', ') AS ubicaciones
                ${desde}
                GROUP BY a.cod_int_artic, a.des_artic, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
                ORDER BY l.fecha_venci_lote_sucursal ASC, a.des_artic ASC
                LIMIT :limite OFFSET :offset
            `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
            dbLocal.query<any>(`
                SELECT COUNT(DISTINCT s.id_lote)                                          AS lotes,
                       COALESCE(SUM(s.cantidad), 0)                                       AS piezas,
                       COALESCE(SUM(s.cantidad * COALESCE(l.precio_costo_lote_sucursal, 0)), 0) AS valor
                ${desde}
            `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
        ]);

        const t = totales[0] ?? {};
        const totalLotes = num(t.lotes);
        return {
            rango,
            page,
            limite,
            total_paginas: Math.max(1, Math.ceil(totalLotes / limite)),
            totales: { lotes: totalLotes, piezas: num(t.piezas), valor: +num(t.valor).toFixed(2) },
            lotes: filas.map(r => ({
                cod_int_artic: r.cod_int_artic as number,
                des_artic: r.des_artic as string,
                lote: (r.lote ?? '') as string,
                caducidad: r.caducidad as string,
                dias: num(r.dias),                       // negativo = ya caducó hace N días
                cantidad: num(r.cantidad),
                apartada: num(r.apartada),
                valor: +num(r.valor).toFixed(2),
                ubicaciones: (r.ubicaciones ?? '') as string,
            })),
        };
    },
};
