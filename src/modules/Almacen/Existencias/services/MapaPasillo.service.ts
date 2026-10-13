import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { compararNatural } from '../../../../utils/ordenLotes';

// "Mapa en lista" de un pasillo: cada ubicación de estantería con el artículo que tiene como default,
// su existencia y desde cuándo está en cero.

const num = (v: unknown) => Number(v ?? 0) || 0;
const iso = (v: unknown) => (v ? new Date(v as any).toISOString() : null);
const txt = (v: unknown) => String(v ?? '').trim();

// Dónde más está el artículo (para el desglose de "En otras ubic.")
export interface OtraUbicacion {
    id_ubicacion: string | null;      // null = sin ubicación (por acomodar)
    etiqueta: string;
    tipo: 'ESTANTERIA' | 'TARIMA' | 'SIN_UBICACION';
    pz: number;
}

export interface ArticuloEnUbicacion {
    id_articulo: string;
    codigo: number | null;
    nombre: string;
    existencia: number;              // en ESTA ubicación
    apartada: number;
    en_otras_ubicaciones: number;    // del mismo artículo, fuera de esta ubicación
    otras_ubicaciones: OtraUbicacion[];    // dónde está esa existencia
    sin_existencia_desde: string | null;   // solo si existencia = 0
    en_recibo: number;               // ya llegó y está en una factura de proveedor sin checar
    en_transito: number;             // pedido al proveedor y aún no llega
    proveedores_transito: string;
}

export interface UbicacionMapa {
    id_ubicacion: string;
    etiqueta: string;
    anaquel: string;
    nivel: string;
    posicion: string;
    articulos: ArticuloEnUbicacion[];      // los que tienen ESTA ubicación como default
    otros_piezas: number;                  // piezas de artículos que NO son el default
    otros_articulos: string | null;
}

export const MapaPasilloService = {

    getPasillos: async (id_empresa: string) => {
        const filas = await dbLocal.query<any>(`
            SELECT UPPER(TRIM(pasillo_ub)) AS pasillo, COUNT(*) AS ubicaciones
            FROM ubicacion_sucursal
            WHERE id_empresa_sucursal = :emp AND activo = true AND tipo_ubicacion = 'ESTANTERIA'
              AND pasillo_ub IS NOT NULL AND TRIM(pasillo_ub) <> ''
            GROUP BY UPPER(TRIM(pasillo_ub))
        `, { replacements: { emp: id_empresa }, type: QueryTypes.SELECT }) as any[];
        return filas
            .map(f => ({ pasillo: String(f.pasillo), ubicaciones: num(f.ubicaciones) }))
            .sort((a, b) => compararNatural(a.pasillo, b.pasillo));
    },

    getMapa: async (id_empresa: string, pasillo: string) => {
        const p = txt(pasillo).toUpperCase();
        if (!p) throw new Error('Indica el pasillo.');

        const filas = await dbLocal.query<any>(`
            WITH u AS (
                SELECT id_ubicacion_sucursal AS id, pasillo_ub, anaquel_ub, nivel_ub, posicion_ub
                FROM ubicacion_sucursal
                WHERE id_empresa_sucursal = :emp AND activo = true AND tipo_ubicacion = 'ESTANTERIA'
                  AND UPPER(TRIM(pasillo_ub)) = :pasillo
            ),
            movs AS (
                SELECT x.ub, x.id_articulo, MAX(x.fecha) AS ultimo
                FROM (
                    SELECT k.id_origen_ubicacion AS ub, k.id_articulo, k.fecha
                    FROM kardex_movimientos_articulos k
                    WHERE k.id_empresa = :emp AND k.id_origen_ubicacion IN (SELECT id FROM u)
                    UNION ALL
                    SELECT k.id_destino_ubicacion AS ub, k.id_articulo, k.fecha
                    FROM kardex_movimientos_articulos k
                    WHERE k.id_empresa = :emp AND k.id_destino_ubicacion IN (SELECT id FROM u)
                ) x
                GROUP BY x.ub, x.id_articulo
            )
            SELECT u.id, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub,
                   d.id_articulo, a.cod_int_artic, a.des_artic,
                   COALESCE((SELECT SUM(s.cantidad) FROM stock_ubicacion_lote s
                             WHERE s.id_ubicacion_sucursal = u.id AND s.id_articulo = d.id_articulo), 0) AS existencia,
                   COALESCE((SELECT SUM(COALESCE(s.cantidad_apartada, 0)) FROM stock_ubicacion_lote s
                             WHERE s.id_ubicacion_sucursal = u.id AND s.id_articulo = d.id_articulo), 0) AS apartada,
                   (SELECT MAX(s."updatedAt") FROM stock_ubicacion_lote s
                    WHERE s.id_ubicacion_sucursal = u.id AND s.id_articulo = d.id_articulo) AS stock_actualizado,
                   COALESCE((SELECT SUM(s.cantidad) FROM stock_ubicacion_lote s
                             WHERE s.id_empresa_sucursal = :emp AND s.id_articulo = d.id_articulo
                               AND s.id_ubicacion_sucursal IS DISTINCT FROM u.id), 0) AS en_otras,
                   m.ultimo AS ultimo_movimiento,
                   COALESCE((SELECT SUM(s.cantidad) FROM stock_ubicacion_lote s
                             WHERE s.id_ubicacion_sucursal = u.id
                               AND s.id_articulo IS DISTINCT FROM d.id_articulo), 0) AS otros_piezas,
                   (SELECT STRING_AGG(DISTINCT a2.des_artic, ', ') FROM stock_ubicacion_lote s
                    JOIN articulo a2 ON a2.id_artic = s.id_articulo
                    WHERE s.id_ubicacion_sucursal = u.id AND s.cantidad > 0
                      AND s.id_articulo IS DISTINCT FROM d.id_articulo) AS otros_articulos
            FROM u
            LEFT JOIN articulo_ubicacion_default d
                   ON d.id_ubicacion_default = u.id AND d.id_empresa_sucursal = :emp
            LEFT JOIN articulo a ON a.id_artic = d.id_articulo
            LEFT JOIN movs m ON m.ub = u.id AND m.id_articulo = d.id_articulo
        `, { replacements: { emp: id_empresa, pasillo: p }, type: QueryTypes.SELECT }) as any[];

        // Compra de los artículos del pasillo (mismos criterios que el tablero de días de inventario):
        //  · En tránsito → orden de compra ya pedida (estados C, A, E, L, K)
        //  · En recibo   → ya llegó y está capturado en una factura de proveedor, falta checarlo
        const ids = Array.from(new Set(filas.map(f => f.id_articulo).filter(Boolean))) as string[];
        const [camino, recibo] = ids.length
            ? await Promise.all([
                dbLocal.query<any>(`
                    SELECT d.idarticulo_detcompsol AS id_articulo, SUM(d.cantidad_detcompsol) AS cant,
                           STRING_AGG(DISTINCT regexp_replace(TRIM(pr.nomcort_prove), '[,\\s]+$', ''), ', ') AS proveedores
                    FROM detalle_compra_solicitado d
                    JOIN compra_proveedor c ON c.id_comp = d.idcompr_detcompsol
                    LEFT JOIN proveedor pr ON pr.id_prove = c.idprove_comp
                    WHERE c.estado_comp IN ('C', 'A', 'E', 'L', 'K') AND d.idarticulo_detcompsol IN (:ids)
                    GROUP BY d.idarticulo_detcompsol
                `, { replacements: { ids }, type: QueryTypes.SELECT }) as Promise<any[]>,
                dbLocal.query<any>(`
                    SELECT dfcp.id_artic AS id_articulo, SUM(dfcp.cantidad_articulo_facturada) AS cant
                    FROM detalle_factura_compra_proveedor dfcp
                    JOIN factura_compra_proveedor fcp ON fcp.id_factura_proveedor = dfcp.id_factura_compra_proveedor
                    WHERE dfcp.checado IS NOT TRUE AND fcp.estado_factura_proveedor NOT IN ('H', 'D')
                      AND dfcp.id_artic IN (:ids)
                    GROUP BY dfcp.id_artic
                `, { replacements: { ids }, type: QueryTypes.SELECT }) as Promise<any[]>,
            ])
            : [[], []];
        const caminoPorArt = new Map<string, any>(camino.map(r => [String(r.id_articulo), r]));
        const reciboPorArt = new Map<string, any>(recibo.map(r => [String(r.id_articulo), r]));

        // Dónde está (ubicación y piezas) cada artículo del pasillo, incluido lo que está sin ubicación
        const dondeFilas = ids.length
            ? await dbLocal.query<any>(`
                SELECT s.id_articulo, s.id_ubicacion_sucursal AS ub,
                       u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub,
                       SUM(s.cantidad) AS pz
                FROM stock_ubicacion_lote s
                LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
                WHERE s.id_empresa_sucursal = :emp AND s.id_articulo IN (:ids) AND s.cantidad > 0
                GROUP BY s.id_articulo, s.id_ubicacion_sucursal, u.tipo_ubicacion, u.tarima_ub,
                         u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub
            `, { replacements: { emp: id_empresa, ids }, type: QueryTypes.SELECT }) as any[]
            : [];
        const dondePorArt = new Map<string, OtraUbicacion[]>();
        for (const r of dondeFilas) {
            const sinUbicar = !r.ub;
            const tarima = r.tipo_ubicacion === 'TARIMA';
            const item: OtraUbicacion = {
                id_ubicacion: r.ub ?? null,
                tipo: sinUbicar ? 'SIN_UBICACION' : tarima ? 'TARIMA' : 'ESTANTERIA',
                etiqueta: sinUbicar
                    ? 'Sin ubicación'
                    : tarima
                        ? `Tarima ${txt(r.tarima_ub)}`
                        : [r.pasillo_ub, r.anaquel_ub, r.nivel_ub, r.posicion_ub].map(txt).filter(Boolean).join('-'),
                pz: num(r.pz),
            };
            const lista = dondePorArt.get(String(r.id_articulo)) ?? [];
            lista.push(item);
            dondePorArt.set(String(r.id_articulo), lista);
        }

        // Una fila por ubicación (puede tener más de un artículo como default)
        const porUbicacion = new Map<string, UbicacionMapa>();
        for (const f of filas) {
            let u = porUbicacion.get(f.id);
            if (!u) {
                const anaquel = txt(f.anaquel_ub), nivel = txt(f.nivel_ub), posicion = txt(f.posicion_ub);
                u = {
                    id_ubicacion: f.id,
                    etiqueta: [txt(f.pasillo_ub), anaquel, nivel, posicion].filter(Boolean).join('-'),
                    anaquel, nivel, posicion,
                    articulos: [],
                    otros_piezas: num(f.otros_piezas),
                    otros_articulos: txt(f.otros_articulos) || null,
                };
                porUbicacion.set(f.id, u);
            }
            if (f.id_articulo) {
                const existencia = num(f.existencia);
                // Desde cuándo está en cero: último cambio de su renglón de stock o, si ya no hay renglón, su último movimiento en esa ubicación
                const desde = existencia > 0 ? null : iso(f.stock_actualizado ?? f.ultimo_movimiento);
                u.articulos.push({
                    id_articulo: f.id_articulo,
                    codigo: f.cod_int_artic === null || f.cod_int_artic === undefined ? null : num(f.cod_int_artic),
                    nombre: txt(f.des_artic),
                    existencia,
                    apartada: num(f.apartada),
                    en_otras_ubicaciones: num(f.en_otras),
                    // Lo que está en cualquier otro lado (esta misma ubicación no cuenta), de mayor a menor
                    otras_ubicaciones: (dondePorArt.get(String(f.id_articulo)) ?? [])
                        .filter(o => o.id_ubicacion !== f.id)
                        .sort((a, b) => b.pz - a.pz),
                    sin_existencia_desde: desde,
                    en_recibo: num(reciboPorArt.get(String(f.id_articulo))?.cant),
                    en_transito: num(caminoPorArt.get(String(f.id_articulo))?.cant),
                    proveedores_transito: txt(caminoPorArt.get(String(f.id_articulo))?.proveedores),
                });
            }
        }

        // Por anaquel → nivel → posición (orden natural: 2 antes que 10)
        const ubicaciones = Array.from(porUbicacion.values()).sort((a, b) =>
            compararNatural(a.anaquel, b.anaquel) || compararNatural(a.nivel, b.nivel) || compararNatural(a.posicion, b.posicion));

        const anaqueles: { anaquel: string; ubicaciones: UbicacionMapa[] }[] = [];
        for (const u of ubicaciones) {
            const ult = anaqueles[anaqueles.length - 1];
            if (ult && ult.anaquel === u.anaquel) ult.ubicaciones.push(u);
            else anaqueles.push({ anaquel: u.anaquel, ubicaciones: [u] });
        }

        const conDefault = ubicaciones.filter(u => u.articulos.length > 0);
        return {
            pasillo: p,
            resumen: {
                ubicaciones: ubicaciones.length,
                anaqueles: anaqueles.length,
                con_existencia: conDefault.filter(u => u.articulos.some(a => a.existencia > 0)).length,
                en_cero: conDefault.filter(u => u.articulos.every(a => a.existencia <= 0)).length,
                sin_default: ubicaciones.length - conDefault.length,
                con_otro_articulo: ubicaciones.filter(u => u.otros_piezas > 0).length,
            },
            anaqueles,
            generado: new Date().toISOString(),
        };
    },
};
