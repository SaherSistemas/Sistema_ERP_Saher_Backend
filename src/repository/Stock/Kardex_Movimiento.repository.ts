
import { v4 as uuidv4 } from 'uuid';
import Kardex_Movimientos from '../../models/Stock/Kardex_Movimientos';
import { QueryTypes } from 'sequelize';
type QuincenaPorTipo = {
  numero: number;        // 1 = quincena más vieja
  quincena: string;      // "YYYY-MM-DD a YYYY-MM-DD"
  svm_total: number;     // suma de cantidad con tipo_movimiento='SVM'
  svt_total: number;     // suma de cantidad con tipo_movimiento='SVT'
  total: number;         // svm_total + svt_total
};

export const Kardex_MovimientosRepository = {
  getAll: async () => {
    return await Kardex_Movimientos.findAll({
      limit: 10
    });
  },
  getTotalesPorQuincenas: async (opts?: { empresa?: number; articulo?: number; today?: string | Date; }) => {
    const sequelize = Kardex_Movimientos.sequelize!;
    const { empresa, articulo, today } = opts || {};

    const rows = await sequelize.query<QuincenaPorTipo>(
      `
      WITH bounds AS (
        SELECT
          MIN(fecha_movimiento)::date AS min_date,
          COALESCE(:today::date, CURRENT_DATE)::date AS today
        FROM kardex_movimientos
        WHERE 1=1
          ${empresa ? 'AND empresa  = :empresa' : ''}
          ${articulo ? 'AND articulo = :articulo' : ''}
      ),
      idx AS (
        SELECT
          GREATEST(
            0,
            CEIL( (((SELECT today FROM bounds) - (SELECT min_date FROM bounds)) + 1) / 15.0 )::int - 1
          ) AS max_k
      ),
      periods AS (
        SELECT
          gs AS k,
          (SELECT today FROM bounds) - (gs*15 + 14) AS start_date,
          (SELECT today FROM bounds) - (gs*15)      AS end_date
        FROM generate_series(0, (SELECT max_k FROM idx)) AS gs
      ),
      agg AS (
        SELECT
          p.k,
          p.start_date,
          p.end_date,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'SVM' THEN m.cantidad END),0) AS svm_total,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'SVT' THEN m.cantidad END),0) AS svt_total
        FROM periods p
        LEFT JOIN kardex_movimientos m
          ON m.fecha_movimiento BETWEEN p.start_date AND p.end_date
         ${empresa ? 'AND m.empresa  = :empresa' : ''}
         ${articulo ? 'AND m.articulo = :articulo' : ''}
        GROUP BY p.k, p.start_date, p.end_date
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY k DESC) AS numero,      -- 1 = más vieja
        to_char(start_date,'YYYY-MM-DD') || ' a ' || to_char(end_date,'YYYY-MM-DD') AS quincena,
        svm_total::bigint,
        svt_total::bigint,
        (svm_total + svt_total)::bigint AS total
      FROM agg
      ORDER BY k DESC;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          empresa,
          articulo,
          today: today ? (typeof today === 'string' ? today : today.toISOString().slice(0, 10)) : null,
        },
      }
    );

    return rows;
  },


}