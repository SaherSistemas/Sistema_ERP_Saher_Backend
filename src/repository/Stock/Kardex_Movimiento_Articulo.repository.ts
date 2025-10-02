import { QueryTypes, Sequelize } from 'sequelize';
import Kardex_Movimientos_Articulos from '../../models/Stock/Kardex_Movimientos_Articulos';
import { dbVieja } from '../../config/db'; // <-- ajusta la ruta del import real


type QuincenaPorTipo = {
  numero: number;     // 1 = más vieja
  quincena: string;   // "YYYY-MM-DD a YYYY-MM-DD"
  svm_total: number;  // suma cantidad_movimiento con tipo_movimiento='SVM'
  svt_total: number;  // suma cantidad_movimiento con tipo_movimiento='SVT'
  total: number;      // svm_total + svt_total
};

type Opts = {
  empresas?: Array<number | string>;
  articulo?: string | number;
  today?: string | Date;  // 'YYYY-MM-DD' | Date
  dias?: number;          // tamaño de ventana; default 15
};
function toYMD(d: string | Date | undefined): string | undefined {
  if (!d) return undefined;
  const dateObj = (d instanceof Date) ? d : new Date(String(d));
  // Ajuste a medianoche para evitar TZ raros
  const iso = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()))
    .toISOString()
    .slice(0, 10);
  return iso; // 'YYYY-MM-DD'
}

export const Kardex_Movimiento_ArticuloRepository = {
  getAll: async () => {
    return await Kardex_Movimientos_Articulos.findAll({ limit: 10 });
  },

  // empresas: UUID[]  |  articulo: UUID único
  getTotalesPorPeriodos: async (opts?: { empresas?: string[]; articulo?: string; today?: string | Date; dias?: number; }) => {
    const sequelize = Kardex_Movimientos_Articulos.sequelize!;
    const { empresas, articulo, today, dias } = opts || {};

    const empList = Array.isArray(empresas) ? empresas.filter(Boolean) : [];
    const art = articulo || null;

    const empFilter = empList.length ? 'AND m.id_empresa IN (:empresas)' : '';
    const artFilter = art ? 'AND m.id_articulo = :articulo' : '';

    const replacements: Record<string, any> = {
      today: today ? (typeof today === 'string' ? today : today.toISOString().slice(0, 10)) : null,
      dias: dias ?? null, // el SQL usa 15 por defecto
    };
    if (empList.length) replacements.empresas = empList;
    if (art) replacements.articulo = art;

    const rows = await sequelize.query(
      `
      WITH params AS (
        SELECT
          COALESCE(:today::date, CURRENT_DATE)::date AS today,
          GREATEST(1, COALESCE(:dias::int, 15))      AS win
      ),
      bounds AS (
        SELECT
          COALESCE(MIN(m.fecha_movimiento)::date, (SELECT today FROM params)) AS min_date,
          (SELECT today FROM params) AS today
        FROM kardex_movimientos_articulos m
        WHERE 1=1
          ${empFilter}
          ${artFilter}
      ),
      idx AS (
        SELECT
          GREATEST(
            0,
            CEIL( (((SELECT today FROM bounds) - (SELECT min_date FROM bounds)) + 1)::numeric
                  / (SELECT win FROM params)::numeric
            )::int - 1
          ) AS max_k
      ),
      periods AS (
        SELECT
          gs AS k,
          (SELECT today FROM params) - (gs*(SELECT win FROM params) + ((SELECT win FROM params)-1)) AS start_date,
          (SELECT today FROM params) - (gs*(SELECT win FROM params))                                  AS end_date
        FROM generate_series(0, (SELECT max_k FROM idx)) AS gs
      ),
      agg AS (
        SELECT
          p.k,
          p.start_date,
          p.end_date,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'SVM' THEN m.cantidad_movimiento END), 0) AS svm_total,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'SVT' THEN m.cantidad_movimiento END), 0) AS svt_total
        FROM periods p
        LEFT JOIN kardex_movimientos_articulos m
          ON m.fecha_movimiento BETWEEN p.start_date AND p.end_date
         ${empFilter}
         ${artFilter}
        GROUP BY p.k, p.start_date, p.end_date
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY k DESC) AS numero,   -- 1 = más vieja
        to_char(start_date,'YYYY-MM-DD') || ' a ' || to_char(end_date,'YYYY-MM-DD') AS quincena,
        svm_total::bigint,
        svt_total::bigint,
        (svm_total + svt_total)::bigint AS total
      FROM agg
      ORDER BY k DESC;
      `,
      { type: QueryTypes.SELECT, replacements }
    );

    const parsed = (rows as any[]).map(r => ({
      numero: Number(r.numero),
      quincena: String(r.quincena),
      svm_total: Number(r.svm_total) || 0,
      svt_total: Number(r.svt_total) || 0,
      total: Number(r.total) || 0,
    })) as QuincenaPorTipo[];

    return parsed;
  },

  getTotalesPorPeriodosPrueba: async (opts?: {
    articulo?: string;
    dias?: number;
  }): Promise<QuincenaPorTipo[]> => {
    const win = Math.max(1, Number(opts?.dias ?? 15));

    const sql = `
  WITH params AS (
    SELECT CURRENT_DATE::date AS today,
           GREATEST(1, :dias::int) AS win
  ),
  bounds AS (
    SELECT COALESCE(MIN(m.kdxfechad::date),(SELECT today FROM params)) AS min_date,
           (SELECT today FROM params) AS today
    FROM public.kardex m
    WHERE m.artcdartn = :articulo::int
      AND TRIM(UPPER(m.tmocdtpoc)) IN ('SVM','SVT')
  ),
  idx AS (
    SELECT GREATEST(0,
      CEIL((((SELECT today FROM bounds) - (SELECT min_date FROM bounds)) + 1)::numeric
           /(SELECT win FROM params)::numeric)::int - 1) AS max_k
  ),
  periods AS (
    SELECT k,
           (SELECT today FROM params) - (k*(SELECT win FROM params) + ((SELECT win FROM params)-1)) AS start_date,
           (SELECT today FROM params) - (k*(SELECT win FROM params))                                  AS end_date
    FROM generate_series(0,(SELECT max_k FROM idx)) AS gs(k)
  ),
  agg AS (
    SELECT p.k,p.start_date,p.end_date,
           COALESCE(SUM(CASE WHEN TRIM(UPPER(m.tmocdtpoc))='SVM' THEN m.kdxcantin END),0)::bigint AS svm_total,
           COALESCE(SUM(CASE WHEN TRIM(UPPER(m.tmocdtpoc))='SVT' THEN m.kdxcantin END),0)::bigint AS svt_total
    FROM periods p
    LEFT JOIN public.kardex m
      ON m.artcdartn = :articulo::int
     AND m.kdxfechad::date BETWEEN p.start_date AND p.end_date
     AND TRIM(UPPER(m.tmocdtpoc)) IN ('SVM','SVT')
    GROUP BY p.k,p.start_date,p.end_date
  )
  SELECT ROW_NUMBER() OVER(ORDER BY k DESC) AS numero,
         to_char(start_date,'YYYY-MM-DD') || ' a ' || to_char(end_date,'YYYY-MM-DD') AS quincena,
         svm_total, svt_total, (svm_total+svt_total)::bigint AS total
  FROM agg
  ORDER BY k DESC;`;

    const rows = await dbVieja.query(sql, {
      type: QueryTypes.SELECT,
      replacements: { dias: win, articulo: opts?.articulo ?? null },
    });

    return (rows as any[]).map(r => ({
      numero: Number(r.numero),
      quincena: String(r.quincena),
      svm_total: Number(r.svm_total) || 0,
      svt_total: Number(r.svt_total) || 0,
      total: Number(r.total) || 0,
    }));
  },


  getTotalesPorPeriodosSTR: async (opts?: {
    articulo?: string;
    dias?: number;
  }): Promise<Array<{ numero: number; quincena: string; str_total: number; total: number }>> => {
    const win = Math.max(1, Number(opts?.dias ?? 15));

    const sql = `
  WITH params AS (
    SELECT CURRENT_DATE::date AS today,
           GREATEST(1, :dias::int) AS win
  ),
  bounds AS (
    SELECT COALESCE(MIN(m.kdxfechad::date),(SELECT today FROM params)) AS min_date,
           (SELECT today FROM params) AS today
    FROM public.kardex m
    WHERE m.artcdartn = :articulo::int
      AND TRIM(UPPER(m.tmocdtpoc)) = 'STR'
  ),
  idx AS (
    SELECT GREATEST(0,
      CEIL((((SELECT today FROM bounds) - (SELECT min_date FROM bounds)) + 1)::numeric
           /(SELECT win FROM params)::numeric)::int - 1) AS max_k
  ),
  periods AS (
    SELECT k,
           (SELECT today FROM params) - (k*(SELECT win FROM params) + ((SELECT win FROM params)-1)) AS start_date,
           (SELECT today FROM params) - (k*(SELECT win FROM params))                                  AS end_date
    FROM generate_series(0,(SELECT max_k FROM idx)) AS gs(k)
  ),
  agg AS (
    SELECT p.k, p.start_date, p.end_date,
           COALESCE(SUM(CASE WHEN TRIM(UPPER(m.tmocdtpoc))='STR' THEN m.kdxcantin END),0)::bigint AS str_total
    FROM periods p
    LEFT JOIN public.kardex m
      ON m.artcdartn = :articulo::int
     AND m.kdxfechad::date BETWEEN p.start_date AND p.end_date
     AND TRIM(UPPER(m.tmocdtpoc)) = 'STR'
    GROUP BY p.k, p.start_date, p.end_date
  ),
  last5 AS (                 -- 👈 quedarnos con k = 0..4 (5 periodos más recientes)
    SELECT *
    FROM agg
    WHERE k BETWEEN 0 AND 4
  )
  SELECT
    ROW_NUMBER() OVER(ORDER BY k DESC) AS numero,                -- 1 = más reciente (k=0)
    to_char(start_date,'YYYY-MM-DD') || ' a ' ||
    to_char(end_date,'YYYY-MM-DD') AS quincena,
    str_total,
    str_total::bigint AS total
  FROM last5
  ORDER BY k DESC;`;

    const rows = await dbVieja.query(sql, {
      type: QueryTypes.SELECT,
      replacements: { dias: win, articulo: opts?.articulo ?? null },
    });

    return (rows as any[]).map(r => ({
      numero: Number(r.numero),
      quincena: String(r.quincena),
      str_total: Number(r.str_total) || 0,
      total: Number(r.total) || 0,
    }));
  }








};
