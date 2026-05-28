import { QueryTypes, Op, WhereOptions, fn, literal, col, Transaction } from 'sequelize';
import Kardex_Movimientos_Articulos from '../model/Kardex_Movimientos_Articulos';
import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Empleado from '../../../RRHH/model/Empleado';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import { Grupo_EmpresaRepository } from '../../../../repository/Empresa_Sucursal/Grupo_Empresa.repository';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { dbLocal, dbPoly } from '../../../../config/db';

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

    const rows = await dbPoly.query(sql, {
      type: QueryTypes.SELECT,
      replacements: { dias: win, articulo: opts?.articulo ?? null },
    });

    return (rows as any[]).map(r => ({
      numero: Number(r.numero),
      quincena: String(r.quincena),
      str_total: Number(r.str_total) || 0,
      total: Number(r.total) || 0,
    }));
  },

  /*
  getTotalesPorPeriodosSTR: async (opts: {
    articulo: string;
    dias: number;
  }) => {
    const { dias } = opts;
    const articulo = Number(opts.articulo);
  
    const sql = `
      WITH periodos AS (
        SELECT
          k.artcdartn AS producto,
          a.artdsartc AS nombre_articulo,
          FLOOR(
            (CURRENT_DATE - k.kdxfechad::date) / ${dias}
          )::INT AS periodo_num,
          k.kdxcantin
        FROM kardex k
        JOIN articulos a ON a.artcdartn = k.artcdartn
        WHERE k.empcdempn IN (20)
          AND k.tmocdtpoc = 'STR'
          AND k.artcdartn = ${articulo}
      )
      SELECT
        producto,
        nombre_articulo,
        SUM(CASE WHEN periodo_num = 0  THEN kdxcantin ELSE 0 END) AS sem_0,
        SUM(CASE WHEN periodo_num = 1  THEN kdxcantin ELSE 0 END) AS sem_1,
        SUM(CASE WHEN periodo_num = 2  THEN kdxcantin ELSE 0 END) AS sem_2,
        SUM(CASE WHEN periodo_num = 3  THEN kdxcantin ELSE 0 END) AS sem_3,
        SUM(CASE WHEN periodo_num = 4  THEN kdxcantin ELSE 0 END) AS sem_4,
        SUM(CASE WHEN periodo_num = 5  THEN kdxcantin ELSE 0 END) AS sem_5,
        SUM(CASE WHEN periodo_num = 6  THEN kdxcantin ELSE 0 END) AS sem_6,
        SUM(CASE WHEN periodo_num = 7  THEN kdxcantin ELSE 0 END) AS sem_7,
        SUM(CASE WHEN periodo_num = 8  THEN kdxcantin ELSE 0 END) AS sem_8,
        SUM(CASE WHEN periodo_num = 9  THEN kdxcantin ELSE 0 END) AS sem_9,
        SUM(CASE WHEN periodo_num = 10 THEN kdxcantin ELSE 0 END) AS sem_10,
        SUM(CASE WHEN periodo_num = 11 THEN kdxcantin ELSE 0 END) AS sem_11,
        SUM(CASE WHEN periodo_num = 12 THEN kdxcantin ELSE 0 END) AS sem_12,
        SUM(kdxcantin) AS total_general
      FROM periodos
      GROUP BY producto, nombre_articulo
      ORDER BY producto
    `;
  
    const resultado = await dbPoly.query<{
      producto: string;
      nombre_articulo: string;
      [key: string]: string | number;
    }>(sql, { type: QueryTypes.SELECT });
  
    if (!resultado.length) return [];
  
    const row = resultado[0];
    const total_general = Number(row.total_general ?? 0);
  
    const fmt = (d: Date) =>
      d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
    const periodos: Array<{
      numero: number;
      quincena: string;
      str_total: number;
      total: number;
    }> = [];
  
    for (let i = 0; i <= 12; i++) {
      const str_total = Number(row[`sem_${i}`] ?? 0);
  
      if (str_total === 0) continue;
  
      const hoy = new Date();
  
      const fechaFin = new Date(hoy);
      fechaFin.setDate(hoy.getDate() - i * dias);
  
      const fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - ((i + 1) * dias - 1));
  
      periodos.push({
        numero: i,
        quincena: `${fmt(fechaInicio)} - ${fmt(fechaFin)}`,
        str_total,
        total: total_general,
      });
    }
  
    return periodos;
  },*/

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
        AND TRIM(UPPER(m.tmocdtpoc)) IN ('SVM')
        AND m.empcdempn IN (2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 21) -- solo empresas del grupo ERP-Saher
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
             COALESCE(SUM(CASE WHEN TRIM(UPPER(m.tmocdtpoc))='SVM' THEN m.kdxcantin END),0)::bigint AS svm_total
      FROM periods p
      LEFT JOIN public.kardex m
        ON m.artcdartn = :articulo::int
       AND m.kdxfechad::date BETWEEN p.start_date AND p.end_date
       AND TRIM(UPPER(m.tmocdtpoc)) IN ('SVM')
      GROUP BY p.k,p.start_date,p.end_date
    )
    SELECT ROW_NUMBER() OVER(ORDER BY k DESC) AS numero,
           to_char(start_date,'YYYY-MM-DD') || ' a ' || to_char(end_date,'YYYY-MM-DD') AS quincena,
           svm_total, 0 AS svt_total, svm_total::bigint AS total
    FROM agg
    ORDER BY k DESC;`;

    const rows = await dbPoly.query(sql, {
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
  /*
  getTotalesPorPeriodosPrueba: async (opts: {
    articulo: string;
    dias: number;
  }) => {
    const { dias } = opts;
    const articulo = Number(opts.articulo);
  
    const sql = `
    WITH semanas AS (
      SELECT
        k.artcdartn AS producto,
        a.artdsartc AS nombre_articulo,
        FLOOR(
          (CURRENT_DATE - k.kdxfechad::date) / ${dias}
        )::INT AS semana_num,
        k.kdxcantin
      FROM kardex k
      JOIN articulos a ON a.artcdartn = k.artcdartn
      WHERE k.empcdempn IN (2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 21)
        AND k.tmocdtpoc = 'SVM'
        AND k.artcdartn = ${articulo}
    )
    SELECT
      producto,
      nombre_articulo,
      SUM(CASE WHEN semana_num = 0  THEN kdxcantin ELSE 0 END) AS sem_0,
      SUM(CASE WHEN semana_num = 1  THEN kdxcantin ELSE 0 END) AS sem_1,
      SUM(CASE WHEN semana_num = 2  THEN kdxcantin ELSE 0 END) AS sem_2,
      SUM(CASE WHEN semana_num = 3  THEN kdxcantin ELSE 0 END) AS sem_3,
      SUM(CASE WHEN semana_num = 4  THEN kdxcantin ELSE 0 END) AS sem_4,
      SUM(CASE WHEN semana_num = 5  THEN kdxcantin ELSE 0 END) AS sem_5,
      SUM(CASE WHEN semana_num = 6  THEN kdxcantin ELSE 0 END) AS sem_6,
      SUM(CASE WHEN semana_num = 7  THEN kdxcantin ELSE 0 END) AS sem_7,
      SUM(CASE WHEN semana_num = 8  THEN kdxcantin ELSE 0 END) AS sem_8,
      SUM(CASE WHEN semana_num = 9  THEN kdxcantin ELSE 0 END) AS sem_9,
      SUM(CASE WHEN semana_num = 10 THEN kdxcantin ELSE 0 END) AS sem_10,
      SUM(CASE WHEN semana_num = 11 THEN kdxcantin ELSE 0 END) AS sem_11,
      SUM(CASE WHEN semana_num = 12 THEN kdxcantin ELSE 0 END) AS sem_12,
      SUM(kdxcantin) AS total_general
    FROM semanas
    GROUP BY producto, nombre_articulo
    ORDER BY producto
  `;
  
    //console.log("SQL generado:\n", sql); // 👈 verifica que el SQL esté bien
  
    const resultado = await dbPoly.query<{
      producto: string;
      nombre_articulo: string;
      [key: string]: string | number;
    }>(sql, {
      type: QueryTypes.SELECT,
    });
  
    //  console.log("resultado length:", resultado.length);
    //  console.log("resultado raw:", JSON.stringify(resultado, null, 2));
  
    if (!resultado.length) return [];
  
    const row = resultado[0];
    const total_general = Number(row.total_general ?? 0);
  
    const fmt = (d: Date) =>
      d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
    const periodos: Array<{
      numero: number;
      quincena: string;
      svm_total: number;
      total: number;
    }> = [];
  
    for (let i = 0; i <= 12; i++) {
      const svm_total = Number(row[`sem_${i}`] ?? 0);
  
      if (svm_total === 0) continue;
  
      const hoy = new Date();
  
      const fechaFin = new Date(hoy);
      fechaFin.setDate(hoy.getDate() - i * dias);
  
      const fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - ((i + 1) * dias - 1));
  
      periodos.push({
        numero: i,
        quincena: `${fmt(fechaInicio)} - ${fmt(fechaFin)}`,
        svm_total,
        total: total_general,
      });
    }
  
    return periodos;
  },
  */
  create: async (data: ICreateKardex_Movimiento) => {
    return await Kardex_Movimientos_Articulos.create({ ...data });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTRAR SALIDA POR FACTURACIÓN
  //   Por cada artículo+lote del pedido, crea un movimiento VENTA en el kardex.
  //   Se ejecuta dentro de la misma transacción que el descuento de stock.
  // ─────────────────────────────────────────────────────────────────────────
  registrarSalidaPorFactura: async (opts: {
    id_pedido_alm: string;
    id_empresa: string;
    id_empleado: string;
    id_factura: string;   // documento_ref (UUID de la factura generada)
    cod_pedido: string;   // para la nota descriptiva
    t: Transaction;
  }) => {
    const { id_pedido_alm, id_empresa, id_empleado, id_factura, cod_pedido, t } = opts;

    // Obtener todos los lotes involucrados en el pedido
    const lotes = await dbLocal.query<{
      id_articulo: string;
      id_lote_sucursal: string;
      total_cantidad: string;  // raw SQL devuelve string
    }>(`
      SELECT
        dpa.id_articulo,
        dpal.id_lote_sucursal,
        SUM(dpal.cantidad) AS total_cantidad
      FROM detalle_pedido_almacen dpa
      JOIN detalle_pedido_almacen_lote dpal
        ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
      WHERE dpa.id_pedido_almacen = :id_pedido_alm
      GROUP BY dpa.id_articulo, dpal.id_lote_sucursal
    `, {
      replacements: { id_pedido_alm },
      type: QueryTypes.SELECT,
      transaction: t,
    });

    if (!lotes.length) return;

    const now = new Date();

    await Kardex_Movimientos_Articulos.bulkCreate(
      lotes.map(l => ({
        id_empresa,
        fecha: now,
        id_articulo: l.id_articulo,
        id_lote: l.id_lote_sucursal,
        tipo_movimiento: 'VENTA' as const,
        categoria: 'Entrada_Salida' as const,
        cantidad_movimiento: Number(l.total_cantidad),
        id_pedido: id_pedido_alm,
        documento_ref: id_factura,
        id_empleado,
        notas: `Salida por facturación - Pedido ${cod_pedido}`,
      })),
      { transaction: t }
    );
  },


  findMovimientos: async (filtros: IFiltrosMovimientos) => {
    const { id_empresa, id_articulo, tipo_movimiento, categoria, fecha_inicio, fecha_fin, page = 1, limit = 50 } = filtros;

    const where: WhereOptions<any> = {};

    if (id_empresa) where['id_empresa'] = id_empresa;
    if (tipo_movimiento) where['tipo_movimiento'] = tipo_movimiento;
    if (categoria) where['categoria'] = categoria;

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
        ...(fecha_fin ? { [Op.lte]: new Date(fecha_fin + 'T23:59:59') } : {}),
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