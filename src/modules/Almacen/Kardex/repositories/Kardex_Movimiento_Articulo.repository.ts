import { QueryTypes, Op, WhereOptions } from 'sequelize';
import Kardex_Movimientos_Articulos from '../model/Kardex_Movimientos_Articulos';
import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Empleado from '../../../RRHH/model/Empleado';

type QuincenaPorTipo = {
  numero: number;
  quincena: string;
  svm_total: number;
  svt_total: number;
  total: number;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IFiltrosMovimientos {
  id_empresa?: string;
  id_articulo?: string;   // UUID o código de barras
  tipo_movimiento?: string;
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

export const Kardex_Movimiento_ArticuloRepository = {

  create: async (data: ICreateKardex_Movimiento) => {
    return await Kardex_Movimientos_Articulos.create({ ...data });
  },

  findMovimientos: async (filtros: IFiltrosMovimientos) => {
    const { id_empresa, id_articulo, tipo_movimiento, categoria, fecha_inicio, fecha_fin, page = 1, limit = 50 } = filtros;

    const where: WhereOptions<any> = {};

    if (id_empresa)      where['id_empresa']      = id_empresa;
    if (tipo_movimiento) where['tipo_movimiento'] = tipo_movimiento;
    if (categoria)       where['categoria']       = categoria;

    // Si es UUID lo usamos directo; si es código de barras buscamos primero el artículo
    if (id_articulo) {
      if (UUID_REGEX.test(id_articulo)) {
        where['id_articulo'] = id_articulo;
      } else {
        const arts = await Articulo.findAll({
          where: { cod_barr_artic: id_articulo },
          attributes: ['id_artic'],
        });
        if (arts.length === 0) {
          return { movimientos: [], total: 0, paginas: 0, pagina_actual: page };
        }
        where['id_articulo'] = { [Op.in]: arts.map(a => a.get('id_artic')) };
      }
    }

    if (fecha_inicio || fecha_fin) {
      where['fecha'] = {
        ...(fecha_inicio ? { [Op.gte]: new Date(fecha_inicio) } : {}),
        ...(fecha_fin    ? { [Op.lte]: new Date(fecha_fin + 'T23:59:59') } : {}),
      };
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Kardex_Movimientos_Articulos.findAndCountAll({
      where,
      include: [
        { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_barr_artic'] },
        { model: Empleado, attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'] },
      ],
      order: [['fecha', 'DESC']],
      limit,
      offset,
    });

    return {
      movimientos: rows.map(r => r.get({ plain: true })),
      total: count,
      paginas: Math.ceil(count / limit),
      pagina_actual: page,
    };
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

  /*  getTotalesPorPeriodosPrueba: async (opts?: {
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
   
      /* const rows = await dbVieja.query(sql, {
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
      
      },*/


  /* getTotalesPorPeriodosSTR: async (opts?: {
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
     /*
         const rows = await dbVieja.query(sql, {
           type: QueryTypes.SELECT,
           replacements: { dias: win, articulo: opts?.articulo ?? null },
         });
     
         return (rows as any[]).map(r => ({
           numero: Number(r.numero),
           quincena: String(r.quincena),
           str_total: Number(r.str_total) || 0,
           total: Number(r.total) || 0,
         }));*/
  /*  }
  };
  
  */
}