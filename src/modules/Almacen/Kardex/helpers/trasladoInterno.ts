import { QueryTypes, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { dbLocal } from '../../../../config/db';
import Kardex_Movimientos_Articulos from '../model/Kardex_Movimientos_Articulos';

// Etiqueta legible de una ubicación: "Tarima 1" o "A-1-1-2"
const etiqueta = (u: any) => String(u?.tarima_ub ?? '').trim()
    ? `Tarima ${String(u.tarima_ub).trim()}`
    : [u?.pasillo_ub, u?.anaquel_ub, u?.nivel_ub, u?.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-');

export async function etiquetasUbicaciones(ids: string[], t?: Transaction): Promise<Map<string, string>> {
    const limpios = Array.from(new Set(ids.filter(Boolean)));
    const mapa = new Map<string, string>();
    if (limpios.length === 0) return mapa;
    const us = await dbLocal.query<any>(
        `SELECT id_ubicacion_sucursal, tarima_ub, pasillo_ub, anaquel_ub, nivel_ub, posicion_ub
         FROM ubicacion_sucursal WHERE id_ubicacion_sucursal IN (:ids)`,
        { replacements: { ids: limpios }, type: QueryTypes.SELECT, transaction: t });
    for (const u of us) mapa.set(String(u.id_ubicacion_sucursal), etiqueta(u));
    return mapa;
}

/**
 * Deja en el Kardex un movimiento INTERNO (TRASLADO / Movimiento_Interno): mover mercancía de una ubicación a otra, o sacarla
 * para un pedido. No cambia la existencia total (el Kardex ya trata así a los traslados) y no sale en el kardex normal: se ve
 * con la casilla "Movimientos de artículos".
 * La nota empieza con la acción ("Mover", "Surtido"…) para poder clasificarlo.
 */
export async function registrarTrasladoInterno(t: Transaction, p: {
    id_empresa: string;
    id_articulo: string;
    id_lote: string | null;
    id_origen_ubicacion?: string | null;
    id_destino_ubicacion?: string | null;
    cantidad: number;
    id_empleado?: string | null;
    id_pedido?: string | null;
    accion: 'Mover' | 'Surtido';
    /** Solo para "Surtido": si se surtió con la app o con hoja en papel */
    via?: 'app' | 'hoja';
    /** Texto del destino cuando no es una ubicación (por ejemplo "Pedido POLY-38600") */
    destino_texto?: string;
}) {
    const cantidad = Number(p.cantidad) || 0;
    if (cantidad <= 0) return;
    const et = await etiquetasUbicaciones([p.id_origen_ubicacion ?? '', p.id_destino_ubicacion ?? ''], t);
    const origen = p.id_origen_ubicacion ? (et.get(p.id_origen_ubicacion) ?? 'ubicación') : 'Sin ubicación';
    const destino = p.destino_texto ?? (p.id_destino_ubicacion ? (et.get(p.id_destino_ubicacion) ?? 'ubicación') : 'Sin ubicación');

    await Kardex_Movimientos_Articulos.create({
        id_kardex_movimientos: uuidv4(),
        id_empresa: p.id_empresa,
        fecha: new Date(),
        id_articulo: p.id_articulo,
        id_lote: p.id_lote ?? null,
        tipo_movimiento: 'TRASLADO' as const,
        categoria: 'Movimiento_Interno' as const,
        id_origen_ubicacion: p.id_origen_ubicacion ?? null,
        id_destino_ubicacion: p.id_destino_ubicacion ?? null,
        cantidad_movimiento: cantidad,
        documento_ref: null,
        id_pedido: p.id_pedido ?? null,
        id_empleado: p.id_empleado ?? null,
        notas: `${p.accion}${p.via ? ` (${p.via})` : ''} · ${origen} → ${destino}`,
    } as any, { transaction: t });
}
