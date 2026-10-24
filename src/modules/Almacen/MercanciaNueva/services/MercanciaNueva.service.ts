import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import { dbLocal, dbPoly } from '../../../../config/db';
import { patronBusqueda } from '../../../../utils/busqueda';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Mercancía que ya se chequeó en Recibo de mercancía y entró al almacén: para que mostrador vea qué llegó de nuevo.
// Sale de las entradas del Kardex ligadas a una factura de proveedor (el chequeo registra ahí lo que entra), una fila por
// artículo y lote de cada recibo, de lo más reciente a lo más antiguo.
// Texto de celda seguro: lo que empieza con = + - @ lo toma Excel como fórmula
const textoCelda = (v: unknown) => {
    const s = String(v ?? '').trim().slice(0, 200);
    return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

// Lo que se muestra de cada artículo en las tarjetas: existencia del almacén, negados vigentes, existencia de la sucursal en PolyDB,
// lo que va en camino (traslados en PolyDB) y lo que ya está pedido en pedidos de la sucursal. `filas` trae id_artic, cod_int_artic,
// des_artic y cod_barr_artic; lo demás (fecha, lote, folio…) solo existe cuando vienen de una entrada del Kardex.
async function enriquecerArticulos(id_empresa: string, filas: any[], EMPRESAS_GRUPO: string, NEGADOS_VIGENTES: string) {
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
    let nombreSucursal = '';
    let empPolyUsuario = -1;   // id de la sucursal en el sistema anterior (-1 = no tiene)
    try {
        const [emp] = await dbLocal.query<any>(
            `SELECT id_empresa_sys_anterior, nom_empre FROM empresa_sucursal WHERE id_empre = :emp`,
            { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
        nombreSucursal = String(emp?.nom_empre ?? '').trim();
        const empPoly = Number(emp?.id_empresa_sys_anterior);
        if (Number.isFinite(empPoly) && empPoly > 0) empPolyUsuario = empPoly;
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

    // EN PROCESO: pedidos de la sucursal del usuario (su cliente en el ERP) con ese artículo que todavía no se facturan
    const procesoPorArt = new Map<string, { pz: number; pedidos: number }>();
    // EN TRÁNSITO: traslados (TRA) hacia la sucursal cuya "factura por recibir" aún no termina de recibirse (C = por recibir,
    // R = en chequeo), y si ya están registrados en PolyDB (rme0010)
    const transitoPorArt = new Map<string, { pz: number; pz_en_poly: number; folios: { folio: string; en_poly: boolean }[] }>();
    if (ids.length) {
        try {
            const proceso = await dbLocal.query<any>(`
                SELECT dpa.id_articulo, SUM(dpa.cant_pedida) AS pz, COUNT(DISTINCT pa.id_pedido_alm) AS pedidos
                FROM pedido_almacen pa
                JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
                JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = pa.id_pedido_alm
                WHERE (ca.id_empresa_sys_nuevo = :emp OR ca.id_empresa_sys_anterior = :empPoly)
                  AND pa.status_pedido_alm IN ('CA', 'SU', 'CH', 'EM') AND pa.fecha_facturado_pedido_alm IS NULL
                  AND dpa.id_articulo IN (:ids)
                GROUP BY dpa.id_articulo
            `, { replacements: { emp: id_empresa, empPoly: empPolyUsuario, ids }, type: QueryTypes.SELECT }) as any[];
            for (const r of proceso) procesoPorArt.set(r.id_articulo, { pz: num(r.pz), pedidos: num(r.pedidos) });

            // Traslados de la sucursal que van en camino. Manda PolyDB, que es donde la sucursal los recibe: recibo de mercancía
            // (rme0010) TRA-empresa-folio en estatus C (Capturado) de los últimos 7 días; al aplicarse deja de contar.
            const codAId = new Map<number, string>(filas.map(x => [Number(x.cod_int_artic), x.id_artic as string]));
            const codsLista = Array.from(codAId.keys());
            const registrados = new Set<string>();
            if (empPolyUsuario > 0 && codsLista.length) {
                const pendientes = await dbPoly.query<any>(`
                    SELECT d.artcdartn::int AS art, h.rmenufacc, COALESCE(SUM(d.rmecanfan), 0)::float AS pz
                    FROM public.rme0010 h
                    JOIN public.rme00101 d ON d.empcdempn = h.empcdempn AND d.rmenufacc = h.rmenufacc
                    WHERE h.empcdempn = :emp AND h.rmenufacc LIKE 'TRA-%' AND TRIM(h.rmestatuc) = 'C'
                      AND h.rmefecfad >= CURRENT_DATE - 7 AND d.artcdartn IN (:cods)
                    GROUP BY 1, 2
                `, { replacements: { emp: empPolyUsuario, cods: codsLista }, type: QueryTypes.SELECT }) as any[];
                for (const p of pendientes) {
                    const idArt = codAId.get(Number(p.art));
                    if (!idArt) continue;
                    registrados.add(String(p.rmenufacc).trim());
                    const acum = transitoPorArt.get(idArt) ?? { pz: 0, pz_en_poly: 0, folios: [] };
                    acum.pz += num(p.pz);
                    acum.pz_en_poly += num(p.pz);
                    acum.folios.push({ folio: String(p.rmenufacc).trim(), en_poly: true });
                    transitoPorArt.set(idArt, acum);
                }
            }

            // Traslados hechos en el ERP en los últimos 7 días que NO llegaron a PolyDB (aviso: la sucursal no los puede recibir)
            const trasladosErp = await dbLocal.query<any>(`
                SELECT df.id_articulo, f.folio_factura, SUM(df.cantidad_facturada) AS pz
                FROM facturas f
                JOIN cliente_almacen ca ON ca.id_cliente_alm = f.id_cliente_alm
                JOIN detalle_factura df ON df.id_factura = f.id_factura
                WHERE f.origen_factura = 'TRA' AND COALESCE(f.estatus_factura, '') <> 'CAN'
                  AND f."createdAt" >= NOW() - INTERVAL '7 days'
                  AND (ca.id_empresa_sys_nuevo = :emp OR ca.id_empresa_sys_anterior = :empPoly)
                  AND df.id_articulo IN (:ids)
                GROUP BY df.id_articulo, f.folio_factura
            `, { replacements: { emp: id_empresa, empPoly: empPolyUsuario, ids }, type: QueryTypes.SELECT }) as any[];
            const recibosErp = Array.from(new Set(trasladosErp.map(t => `TRA-${empPolyUsuario}-${t.folio_factura}`)));
            const existentesPoly = new Set<string>();
            if (empPolyUsuario > 0 && recibosErp.length) {
                try {
                    const rows = await dbPoly.query<{ rmenufacc: string }>(
                        `SELECT rmenufacc FROM public.rme0010 WHERE empcdempn = :emp AND rmenufacc IN (:recibos)`,
                        { type: QueryTypes.SELECT, replacements: { emp: empPolyUsuario, recibos: recibosErp } });
                    for (const r of rows) existentesPoly.add(String(r.rmenufacc).trim());
                } catch (e: any) {
                    console.warn('[MercanciaNueva] No se pudo revisar los traslados en PolyDB:', e?.message ?? e);
                }
            }
            for (const t of trasladosErp) {
                const recibo = `TRA-${empPolyUsuario}-${t.folio_factura}`;
                if (existentesPoly.has(recibo) || registrados.has(recibo)) continue;   // ya está en PolyDB: lo cuenta el bloque de arriba (o ya se aplicó)
                const acum = transitoPorArt.get(t.id_articulo) ?? { pz: 0, pz_en_poly: 0, folios: [] };
                acum.pz += num(t.pz);
                acum.folios.push({ folio: recibo, en_poly: false });
                transitoPorArt.set(t.id_articulo, acum);
            }
        } catch (e: any) {
            console.warn('[MercanciaNueva] No se pudo calcular lo que va en camino a la sucursal:', e?.message ?? e);
        }
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
            nombre_sucursal: nombreSucursal,
            // Pedidos de la sucursal con este artículo que siguen en el almacén (sin facturar)
            en_proceso_pz: procesoPorArt.get(f.id_artic)?.pz ?? 0,
            en_proceso_pedidos: procesoPorArt.get(f.id_artic)?.pedidos ?? 0,
            // Traslados hacia la sucursal aún sin recibir: piezas, cuántas ya están en PolyDB y los folios
            en_transito_pz: transitoPorArt.get(f.id_artic)?.pz ?? 0,
            en_transito_pz_en_poly: transitoPorArt.get(f.id_artic)?.pz_en_poly ?? 0,
            en_transito_folios: transitoPorArt.get(f.id_artic)?.folios ?? [],
        };
    });


    return items;
}

export const MercanciaNuevaService = {

    // Excel del pedido que el usuario arma desde esta pantalla (lo que quiere pedir de la mercancía nueva).
    // El pedido vive en el navegador; aquí solo se le da formato de archivo.
    pedidoExcel: async (id_empresa: string, items: Array<{ cod_int_artic?: unknown; des_artic?: unknown; cod_barr_artic?: unknown; cantidad?: unknown }>, tipo: 'NUEVA' | 'GENERAL' = 'NUEVA') => {
        const renglones = items
            .map(i => ({
                codigo: textoCelda(i.cod_int_artic),
                articulo: textoCelda(i.des_artic),
                barras: textoCelda(i.cod_barr_artic),
                cantidad: Math.floor(Number(i.cantidad) || 0),
            }))
            .filter(r => r.codigo && r.cantidad > 0);
        if (!renglones.length) throw { status: 400, message: 'El pedido no tiene artículos con cantidad.' };

        const [emp] = await dbLocal.query<any>(
            `SELECT nom_empre FROM empresa_sucursal WHERE id_empre = :emp`,
            { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
        const sucursal = String(emp?.nom_empre ?? '').trim();
        const ahora = new Date();
        const fecha = ahora.toLocaleString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });

        const filas: (string | number)[][] = [
            [`${tipo === 'GENERAL' ? 'PEDIDO GENERAL' : 'PEDIDO DE MERCANCÍA NUEVA'} · ${sucursal}`],
            [`Fecha: ${fecha}`],
            [],
            ['Código', 'Artículo', 'Código de barras', 'Cantidad'],
            ...renglones.map(r => [r.codigo, r.articulo, r.barras, r.cantidad]),
            [],
            ['', '', 'Total de piezas', renglones.reduce((s, r) => s + r.cantidad, 0)],
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws['!cols'] = [{ wch: 9 }, { wch: 60 }, { wch: 18 }, { wch: 11 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
        const pad = (x: number) => String(x).padStart(2, '0');
        const nombre = `${tipo === 'GENERAL' ? 'pedido_general' : 'pedido_mercancia_nueva'}_${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}_${pad(ahora.getHours())}${pad(ahora.getMinutes())}.xlsx`;
        return { nombre, buffer };
    },

    // Búsqueda general de artículos para armar un pedido: cualquier artículo activo del catálogo, con las mismas existencias que las
    // tarjetas de mercancía nueva (almacén, sucursal, en tránsito) pero sin datos de entrada (lote, factura, hora).
    buscarArticulos: async (id_empresa: string, q: string, limite = 40) => {
        const texto = q.trim();
        if (texto.length < 2) return { total: 0, items: [] as any[] };
        const GRUPO = `(
            SELECT e.id_empre FROM empresa_sucursal e
            WHERE e.idgrup_empre = (SELECT idgrup_empre FROM empresa_sucursal WHERE id_empre = :emp)
               OR e.id_empre = :emp
        )`;
        const NEGADOS = `n.recuperado = false AND n.fecha + INTERVAL '7 days' >= NOW()`;
        const filas = await dbLocal.query<any>(`
            SELECT a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic
            FROM articulo a
            WHERE a.status_artic = true
              AND (a.des_artic ILIKE :like OR a.cod_barr_artic ILIKE :like OR a.cod_int_artic::text ILIKE :like)
            ORDER BY (a.cod_int_artic::text = :exacto OR a.cod_barr_artic = :exacto) DESC, a.des_artic ASC
            LIMIT :limite
        `, { replacements: { like: patronBusqueda(texto), exacto: texto, limite: Math.min(150, Math.max(1, limite) * 3) }, type: QueryTypes.SELECT }) as any[];
        const todos = await enriquecerArticulos(id_empresa, filas, GRUPO, NEGADOS);
        // Si no hay en el almacén, ni en la sucursal, ni va en camino, ni está pedido en otro pedido, significa que no hay: no se muestra
        const items = todos
            .filter((it: any) => num(it.disponible) > 0 || num(it.existencia_sucursal) > 0 || num(it.en_transito_pz) > 0 || num(it.en_proceso_pz) > 0)
            .slice(0, Math.max(1, limite));
        return { total: items.length, items };
    },

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
            SELECT MAX(k.fecha) FILTER (WHERE k.tipo_movimiento = 'ENTRADA') AS fecha,
                   a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                   COALESCE(lt.lotes, l.numero_lote_sucursal)             AS lote,
                   COALESCE(lt.caducidad, l.fecha_venci_lote_sucursal)    AS caducidad,
                   -- Entradas menos las correcciones de recepción (lote cambiado o quitado): lo que se corrigió no cuenta como llegado
                   SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' THEN k.cantidad_movimiento ELSE -k.cantidad_movimiento END) AS cantidad,
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
              AND (k.tipo_movimiento = 'ENTRADA' OR (k.tipo_movimiento = 'SALIDA' AND k.notas ILIKE 'Corrección de recepción%'))
              AND k.fecha >= NOW() - (:dias * INTERVAL '1 day')
              ${filtro}
            GROUP BY a.id_artic, a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                     lt.lotes, lt.caducidad, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                     f.folio_factura_proveedor, p.nomcort_prove, f.id_factura_proveedor
            HAVING SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' THEN k.cantidad_movimiento ELSE -k.cantidad_movimiento END) > 0
            ORDER BY MAX(k.fecha) FILTER (WHERE k.tipo_movimiento = 'ENTRADA') DESC, a.des_artic ASC
            LIMIT :limite
        `, { replacements: rep, type: QueryTypes.SELECT }) as any[];

        const items = await enriquecerArticulos(id_empresa, filas, EMPRESAS_GRUPO, NEGADOS_VIGENTES);

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
