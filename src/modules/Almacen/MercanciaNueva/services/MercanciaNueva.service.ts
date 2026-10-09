import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Mercancía que ya se chequeó en Recibo de mercancía y entró al almacén: para que mostrador vea qué llegó de nuevo.
// Sale de las entradas del Kardex ligadas a una factura de proveedor (el chequeo registra ahí lo que entra), una fila por
// artículo y lote de cada recibo, de lo más reciente a lo más antiguo.
export const MercanciaNuevaService = {

    getLista: async (id_empresa: string, opts: { dias: number; q: string; limite: number }) => {
        const { dias, q, limite } = opts;
        const busqueda = q.trim();
        const rep: Record<string, any> = { emp: id_empresa, dias, limite };
        // Empresas del mismo grupo que la del usuario (el recibo lo chequea almacén, que puede ser otra empresa que mostrador)
        const EMPRESAS_GRUPO = `(
            SELECT e.id_empre FROM empresa_sucursal e
            WHERE e.idgrup_empre = (SELECT idgrup_empre FROM empresa_sucursal WHERE id_empre = :emp)
               OR e.id_empre = :emp
        )`;
        let filtro = '';
        if (busqueda) {
            rep.like = `%${busqueda}%`;
            filtro = `AND (a.des_artic ILIKE :like OR a.cod_barr_artic ILIKE :like OR a.cod_int_artic::text ILIKE :like OR p.nomcort_prove ILIKE :like)`;
        }

        const filas = await dbLocal.query<any>(`
            SELECT MAX(k.fecha)                         AS fecha,
                   a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                   COALESCE(lt.lotes, l.numero_lote_sucursal)             AS lote,
                   COALESCE(lt.caducidad, l.fecha_venci_lote_sucursal)    AS caducidad,
                   SUM(k.cantidad_movimiento)           AS cantidad,
                   f.folio_factura_proveedor            AS folio,
                   p.nomcort_prove                      AS proveedor
            FROM kardex_movimientos_articulos k
            JOIN factura_compra_proveedor f ON f.id_factura_proveedor::text = k.documento_ref::text
            LEFT JOIN compra_proveedor cp   ON cp.id_comp = f.id_compra_prove_factura
            LEFT JOIN proveedor p           ON p.id_prove = cp.idprove_comp
            JOIN articulo a                 ON a.id_artic = k.id_articulo
            LEFT JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = k.id_lote
            -- El chequeo registra la entrada por artículo; los lotes salen del detalle de la factura
            LEFT JOIN LATERAL (
                SELECT string_agg(lf.numero_lote || ' (' || lf.cantidad_lote || ')', ', ' ORDER BY lf.numero_lote) AS lotes,
                       MIN(lf.fecha_caducidad) AS caducidad
                FROM detalle_factura_compra_proveedor d
                JOIN lote_factura_compra_proveedor lf ON lf.id_det_factura_proveedor = d.id_factura_proveedor_detalle
                WHERE d.id_factura_compra_proveedor = f.id_factura_proveedor AND d.id_artic = k.id_articulo
            ) lt ON TRUE
            WHERE k.id_empresa IN ${EMPRESAS_GRUPO}
              AND k.tipo_movimiento = 'ENTRADA'
              AND k.fecha >= NOW() - (:dias * INTERVAL '1 day')
              ${filtro}
            GROUP BY a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                     lt.lotes, lt.caducidad, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                     f.folio_factura_proveedor, p.nomcort_prove, f.id_factura_proveedor
            ORDER BY MAX(k.fecha) DESC, a.des_artic ASC
            LIMIT :limite
        `, { replacements: rep, type: QueryTypes.SELECT }) as any[];

        // Existencia actual de cada artículo (disponible = existencia menos apartada) para saber si ya se puede vender
        const ids = Array.from(new Set(filas.map(f => f.id_artic)));
        const stock = ids.length
            ? await dbLocal.query<any>(`
                SELECT id_articulo, COALESCE(SUM(cantidad), 0) AS existencia,
                       COALESCE(SUM(GREATEST(cantidad - COALESCE(cantidad_apartada, 0), 0)), 0) AS disponible
                FROM stock_ubicacion_lote
                WHERE id_empresa_sucursal IN ${EMPRESAS_GRUPO} AND id_articulo IN (:ids)
                GROUP BY id_articulo
            `, { replacements: { emp: id_empresa, ids }, type: QueryTypes.SELECT }) as any[]
            : [];
        const stockPorArt = new Map(stock.map(s => [s.id_articulo, s]));

        return {
            dias,
            total: filas.length,
            items: filas.map(f => ({
                fecha: f.fecha,
                cod_int_artic: f.cod_int_artic,
                des_artic: String(f.des_artic ?? '').trim(),
                cod_barr_artic: String(f.cod_barr_artic ?? '').trim(),
                lote: String(f.lote ?? '').trim(),
                caducidad: f.caducidad ?? null,
                cantidad: num(f.cantidad),
                folio: String(f.folio ?? '').trim(),
                proveedor: String(f.proveedor ?? '').trim(),
                existencia: num(stockPorArt.get(f.id_artic)?.existencia),
                disponible: num(stockPorArt.get(f.id_artic)?.disponible),
            })),
            generado: new Date().toISOString(),
        };
    },
};
