import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { etiquetaUbicacion } from '../../Existencias/services/Existencias.service';

const num = (v: unknown) => Number(v ?? 0) || 0;

// Pedidos que de verdad sostienen piezas apartadas: surtidos/chequeados/empacados y aún sin facturar
// (mismo criterio que Existencias por Ubicación → "Apartadas sin pedido").
const PEDIDO_ACTIVO_SQL = `pa.status_pedido_alm IN ('SU', 'CH', 'EM') AND pa.fecha_facturado_pedido_alm IS NULL`;

// Detalle de la tarjeta "Apartada (pedidos)" del Tablero: qué piezas están apartadas, de qué lote y ubicación,
// y qué pedido las tiene. Lo apartado que ningún pedido sostiene se marca aparte (queda "sin pedido").
export const ApartadasService = {

    getLista: async (id_empresa: string) => {
        const lotes = await dbLocal.query<any>(`
            SELECT s.id_lote, s.id_articulo, SUM(COALESCE(s.cantidad_apartada, 0)) AS apartada,
                   a.cod_int_artic, a.des_artic, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
            FROM stock_ubicacion_lote s
            JOIN articulo a ON a.id_artic = s.id_articulo
            JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            WHERE s.id_empresa_sucursal = :emp AND COALESCE(s.cantidad_apartada, 0) > 0
            GROUP BY s.id_lote, s.id_articulo, a.cod_int_artic, a.des_artic, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
            ORDER BY a.des_artic ASC, l.fecha_venci_lote_sucursal ASC
        `, { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });

        if (!lotes.length) return { total_piezas: 0, total_lotes: 0, sin_pedido: 0, lotes: [], generado: new Date().toISOString() };

        const ids = lotes.map(l => l.id_lote);

        const ubic = await dbLocal.query<any>(`
            SELECT s.id_lote, s.cantidad_apartada, s.id_ubicacion_sucursal,
                   u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub
            FROM stock_ubicacion_lote s
            LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :emp AND COALESCE(s.cantidad_apartada, 0) > 0 AND s.id_lote IN (:ids)
        `, { replacements: { emp: id_empresa, ids }, type: QueryTypes.SELECT });

        const pedidos = await dbLocal.query<any>(`
            SELECT dpal.id_lote_sucursal AS id_lote,
                   pa.cod_int_pedido_alm, pa.status_pedido_alm, cs.descrip_almacen AS status_desc,
                   ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm,
                   SUM(dpal.cantidad) AS cantidad
            FROM detalle_pedido_almacen_lote dpal
            JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
            JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
            LEFT JOIN cat_status_pedido_almacen cs ON cs.id_status_pedido_almacen = pa.status_pedido_alm
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE dpal.id_lote_sucursal IN (:ids) AND ${PEDIDO_ACTIVO_SQL}
            GROUP BY dpal.id_lote_sucursal, pa.cod_int_pedido_alm, pa.status_pedido_alm, cs.descrip_almacen,
                     ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm
            ORDER BY pa.cod_int_pedido_alm
        `, { replacements: { ids }, type: QueryTypes.SELECT });

        const ubicPorLote = new Map<string, string[]>();
        for (const u of ubic) {
            const lista = ubicPorLote.get(u.id_lote) ?? [];
            lista.push(`${u.id_ubicacion_sucursal ? etiquetaUbicacion(u) : 'Sin ubicación'} (${num(u.cantidad_apartada)})`);
            ubicPorLote.set(u.id_lote, lista);
        }
        const pedidosPorLote = new Map<string, any[]>();
        for (const p of pedidos) {
            const lista = pedidosPorLote.get(p.id_lote) ?? [];
            lista.push({
                cod_pedido: p.cod_int_pedido_alm,
                status: p.status_pedido_alm,
                status_desc: p.status_desc ?? p.status_pedido_alm,
                cliente: String(p.nom_corto_cliente_alm ?? '').trim() || String(p.razon_social_cliente_alm ?? '').trim() || '—',
                cantidad: num(p.cantidad),
            });
            pedidosPorLote.set(p.id_lote, lista);
        }

        const filas = lotes.map(l => {
            const apartada = num(l.apartada);
            const ped = pedidosPorLote.get(l.id_lote) ?? [];
            const respaldo = ped.reduce((s, p) => s + p.cantidad, 0);
            return {
                cod_int_artic: l.cod_int_artic,
                des_artic: l.des_artic,
                numero_lote: String(l.numero_lote_sucursal ?? '').trim(),
                caducidad: l.fecha_venci_lote_sucursal,
                apartada,
                ubicaciones: (ubicPorLote.get(l.id_lote) ?? []).join(', '),
                pedidos: ped,
                sin_pedido: Math.max(0, apartada - respaldo),
            };
        });

        return {
            total_piezas: filas.reduce((s, f) => s + f.apartada, 0),
            total_lotes: filas.length,
            sin_pedido: filas.reduce((s, f) => s + f.sin_pedido, 0),
            lotes: filas,
            generado: new Date().toISOString(),
        };
    },
};
