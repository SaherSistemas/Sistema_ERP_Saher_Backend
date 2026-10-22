import { QueryTypes } from 'sequelize';
import { dbLocal, dbPoly } from '../../../../config/db';
import { patronBusqueda } from '../../../../utils/busqueda';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Mercancía que ya se chequeó en Recibo de mercancía y entró al almacén: para que mostrador vea qué llegó de nuevo.
// Sale de las entradas del Kardex ligadas a una factura de proveedor (el chequeo registra ahí lo que entra), una fila por
// artículo y lote de cada recibo, de lo más reciente a lo más antiguo.
export const MercanciaNuevaService = {

    getLista: async (id_empresa: string, opts: { dias: number; q: string; limite: number; soloNegados?: boolean }) => {
        const { dias, q, limite, soloNegados } = opts;
        const busqueda = q.trim();
        const rep: Record<string, any> = { emp: id_empresa, dias, limite };
        // Empresas del mismo grupo que la del usuario (el recibo lo chequea almacén, que puede ser otra empresa que mostrador)
        const EMPRESAS_GRUPO = `(
            SELECT e.id_empre FROM empresa_sucursal e
            WHERE e.idgrup_empre = (SELECT idgrup_empre FROM empresa_sucursal WHERE id_empre = :emp)
               OR e.id_empre = :emp
        )`;
        // Negados vigentes (mismo criterio que la lista de Negados de Compras): no recuperados y de los últimos 7 días
        const NEGADOS_VIGENTES = `n.recuperado = false AND n.fecha + INTERVAL '7 days' >= NOW()`;
        let filtro = soloNegados
            ? `AND EXISTS (SELECT 1 FROM detalle_pedido_negado n
                            JOIN detalle_pedido_almacen dpa_n ON dpa_n.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
                            WHERE dpa_n.id_articulo = a.id_artic AND ${NEGADOS_VIGENTES})`
            : '';
        if (busqueda) {
            rep.like = patronBusqueda(busqueda);
            filtro += ` AND (a.des_artic ILIKE :like OR a.cod_barr_artic ILIKE :like OR a.cod_int_artic::text ILIKE :like OR p.nomcort_prove ILIKE :like)`;
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

        // Lo que se negó (pedidos sin existencia) de esos artículos y sigue vigente: para saber qué de lo negado ya llegó
        const negados = ids.length
            ? await dbLocal.query<any>(`
                SELECT dpa.id_articulo, SUM(n.cantidad_negada) AS negada, COUNT(DISTINCT dpa.id_pedido_almacen) AS pedidos
                FROM detalle_pedido_negado n
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = n.id_detalle_pedido_almacen
                WHERE ${NEGADOS_VIGENTES} AND dpa.id_articulo IN (:ids)
                GROUP BY dpa.id_articulo
            `, { replacements: { ids }, type: QueryTypes.SELECT }) as any[]
            : [];
        const negadoPorArt = new Map(negados.map(x => [x.id_articulo, x]));

        // Existencia de la SUCURSAL del usuario en PolyDB (sistema anterior: almacenes1, almacén 1). Si la empresa del usuario no
        // está en el sistema anterior, o PolyDB no responde, se devuelve null y la pantalla no la muestra.
        const existenciaPoly = new Map<number, number>();
        let sucursalPoly = false;
        try {
            const [emp] = await dbLocal.query<any>(
                `SELECT id_empresa_sys_anterior FROM empresa_sucursal WHERE id_empre = :emp`,
                { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
            const empPoly = Number(emp?.id_empresa_sys_anterior);
            const codigos = Array.from(new Set(filas.map(f => Number(f.cod_int_artic)).filter(Number.isFinite)));
            if (Number.isFinite(empPoly) && empPoly > 0) {
                sucursalPoly = true;
                if (codigos.length) {
                    const rowsPoly = await dbPoly.query<{ artcdartn: number; almexistn: number }>(
                        `SELECT artcdartn, COALESCE(almexistn, 0) AS almexistn
                         FROM public.almacenes1
                         WHERE empcdempn = :empPoly AND almcdalmn = 1 AND artcdartn IN (:codigos)`,
                        { type: QueryTypes.SELECT, replacements: { empPoly, codigos } });
                    for (const r of rowsPoly) existenciaPoly.set(Number(r.artcdartn), Number(r.almexistn));
                }
            }
        } catch (e: any) {
            console.warn('[MercanciaNueva] No se pudo leer la existencia de PolyDB:', e?.message ?? e);
            sucursalPoly = false;
        }

        const items = filas.map(f => {
            const negado = num(negadoPorArt.get(f.id_artic)?.negada);       // acumulado de los pedidos negados vigentes
            const existenciaSucursal = sucursalPoly ? (existenciaPoly.get(Number(f.cod_int_artic)) ?? 0) : null;
            return {
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
                // Negado vigente de este artículo (0 si no hay) y cuántos pedidos lo pidieron
                negado,
                negado_pedidos: num(negadoPorArt.get(f.id_artic)?.pedidos),
                // Existencia de la sucursal en PolyDB (null = la sucursal no está en el sistema anterior)
                existencia_sucursal: existenciaSucursal,
            };
        });

        // "Negados que ya llegaron": solo lo que tiene negados vigentes
        const visibles = soloNegados ? items.filter(i => i.negado > 0) : items;

        return {
            dias,
            total: visibles.length,
            solo_negados: !!soloNegados,
            items: visibles,
            generado: new Date().toISOString(),
        };
    },
};
