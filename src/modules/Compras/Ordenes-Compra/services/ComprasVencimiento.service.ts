import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Proveedor_Dias_Entrega from '../model/Proveedor_Dias_Entrega';

// Órdenes a proveedor que no se recibieron a tiempo.
//
// Una orden Enviada (E) a la que ya le pasó el plazo de su proveedor, contado desde el inicio de la compra
// (inicio_de_compra_proveedor), sin recibirse nada, se marca como Vencida (V). Todas las
// consultas de "en tránsito" solo cuentan los estatus C, A, E, L y K, así que una orden Vencida deja de contar sola en todas
// partes. No se borra nada: se puede Reactivar (vuelve a E y el plazo cuenta de nuevo desde ese momento).
//
// Plazo: el de cada proveedor, o el general si no tiene (fila con id en ceros), o DIAS_VENCE_TRANSITO del .env, o 15.
export const ID_PLAZO_GENERAL = '00000000-0000-0000-0000-000000000000';
const DIAS_RESPALDO = Math.max(1, Number(process.env.DIAS_VENCE_TRANSITO) || 15);
const INTERVALO_MS = 6 * 60 * 60 * 1000; // cada 6 horas

let corriendo = false;

export async function getDiasGenerales(): Promise<number> {
    const fila = await Proveedor_Dias_Entrega.findByPk(ID_PLAZO_GENERAL);
    return fila ? Number(fila.dias) : DIAS_RESPALDO;
}

// Marca como Vencidas las órdenes Enviadas cuyo plazo ya pasó y de las que no hay ninguna factura capturada
export async function vencerOrdenesNoRecibidas(): Promise<{ vencidas: number }> {
    const general = await getDiasGenerales();
    const t = await dbLocal.transaction();
    try {
        const filas = await dbLocal.query<{ id_comp: string; dias: number }>(`
            SELECT cp.id_comp, COALESCE(pd.dias, :general) AS dias
            FROM compra_proveedor cp
            LEFT JOIN proveedor_dias_entrega pd ON pd.id_prove = cp.idprove_comp
            LEFT JOIN compra_proveedor_vencida v ON v.id_comp = cp.id_comp
            WHERE cp.estado_comp = 'E'
              AND cp.inicio_de_compra_proveedor IS NOT NULL
              AND GREATEST(cp.inicio_de_compra_proveedor, COALESCE(v.reactivada_en, cp.inicio_de_compra_proveedor))
                    < NOW() - (COALESCE(pd.dias, :general) * INTERVAL '1 day')
              AND NOT EXISTS (SELECT 1 FROM factura_compra_proveedor f WHERE f.id_compra_prove_factura = cp.id_comp)
        `, { replacements: { general }, type: QueryTypes.SELECT, transaction: t });

        for (const f of filas) {
            await dbLocal.query(`
                INSERT INTO compra_proveedor_vencida (id_comp, estado_anterior, vencida_en, dias_aplicados, reactivada_en)
                VALUES (:id_comp, 'E', NOW(), :dias, NULL)
                ON CONFLICT (id_comp) DO UPDATE
                   SET estado_anterior = 'E', vencida_en = NOW(), dias_aplicados = EXCLUDED.dias_aplicados, reactivada_en = NULL
            `, { replacements: { id_comp: f.id_comp, dias: Number(f.dias) }, type: QueryTypes.INSERT, transaction: t });
            await dbLocal.query(
                `UPDATE compra_proveedor SET estado_comp = 'V' WHERE id_comp = :id_comp AND estado_comp = 'E'`,
                { replacements: { id_comp: f.id_comp }, type: QueryTypes.UPDATE, transaction: t });
        }

        await t.commit();
        if (filas.length) console.log(`[ComprasVencidas] ${filas.length} orden(es) enviadas sin recibirse pasaron a Vencida.`);
        return { vencidas: filas.length };
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

export const ComprasVencimientoService = {

    // Órdenes Vencidas de la empresa, con lo que traían
    listarVencidas: async (id_empresa: string) => {
        return await dbLocal.query<any>(`
            SELECT cp.id_comp, p.nomcort_prove AS proveedor, cp.inicio_de_compra_proveedor, cp.fecha_enviada_proveedor, v.vencida_en, v.dias_aplicados,
                   (SELECT COUNT(*) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp)::int AS articulos,
                   (SELECT COALESCE(SUM(d.cantidad_detcompsol), 0) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp)::int AS piezas,
                   (SELECT COALESCE(SUM(d.cantidad_detcompsol * d.precio_detcompsol), 0) FROM detalle_compra_solicitado d WHERE d.idcompr_detcompsol = cp.id_comp) AS monto
            FROM compra_proveedor cp
            JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
            JOIN proveedor p ON p.id_prove = cp.idprove_comp
            LEFT JOIN compra_proveedor_vencida v ON v.id_comp = cp.id_comp
            WHERE cp.estado_comp = 'V' AND cg.id_empresa_sucursal = :id_empresa
            ORDER BY v.vencida_en DESC NULLS LAST, cp.inicio_de_compra_proveedor DESC
        `, { replacements: { id_empresa }, type: QueryTypes.SELECT });
    },

    // Regresa una orden Vencida a como estaba (Enviada); el plazo vuelve a contar desde este momento
    reactivar: async (id_comp: string) => {
        const [orden] = await dbLocal.query<{ estado_comp: string }>(
            `SELECT estado_comp FROM compra_proveedor WHERE id_comp = :id_comp`,
            { replacements: { id_comp }, type: QueryTypes.SELECT });
        if (!orden) throw { status: 404, message: 'Orden no encontrada.' };
        if (orden.estado_comp !== 'V') throw { status: 400, message: 'Solo se pueden reactivar las órdenes Vencidas.' };

        const [bitacora] = await dbLocal.query<{ estado_anterior: string }>(
            `SELECT estado_anterior FROM compra_proveedor_vencida WHERE id_comp = :id_comp`,
            { replacements: { id_comp }, type: QueryTypes.SELECT });
        const estado = bitacora?.estado_anterior || 'E';

        await dbLocal.query(
            `UPDATE compra_proveedor SET estado_comp = :estado WHERE id_comp = :id_comp`,
            { replacements: { id_comp, estado }, type: QueryTypes.UPDATE });
        await dbLocal.query(
            `UPDATE compra_proveedor_vencida SET reactivada_en = NOW() WHERE id_comp = :id_comp`,
            { replacements: { id_comp }, type: QueryTypes.UPDATE });
        return { ok: true, estado };
    },

    // Plazo general y el de cada proveedor (null = usa el general)
    getDiasEntrega: async () => {
        const general = await getDiasGenerales();
        const proveedores = await dbLocal.query<{ id_prove: string; nombre: string; dias: number | null }>(`
            SELECT p.id_prove, p.nomcort_prove AS nombre, pd.dias
            FROM proveedor p
            LEFT JOIN proveedor_dias_entrega pd ON pd.id_prove = p.id_prove
            ORDER BY p.nomcort_prove
        `, { type: QueryTypes.SELECT });
        return { general, proveedores };
    },

    // dias = null quita el plazo propio del proveedor (vuelve al general). id_prove = ID_PLAZO_GENERAL cambia el general.
    setDiasEntrega: async (id_prove: string, dias: number | null) => {
        if (dias === null) {
            if (id_prove === ID_PLAZO_GENERAL) throw { status: 400, message: 'El plazo general no se puede quitar.' };
            await Proveedor_Dias_Entrega.destroy({ where: { id_prove } });
            return { ok: true };
        }
        const n = Math.floor(Number(dias));
        if (!Number.isFinite(n) || n < 1 || n > 365) throw { status: 400, message: 'Los días deben ser un número entre 1 y 365.' };
        await Proveedor_Dias_Entrega.upsert({ id_prove, dias: n } as any);
        return { ok: true };
    },
};

// Revisión automática: una vez al arrancar y después cada 6 horas
export function iniciarVencimientoCompras() {
    const correr = async () => {
        if (corriendo) return;
        corriendo = true;
        try {
            await vencerOrdenesNoRecibidas();
        } catch (err: any) {
            console.error('[ComprasVencidas] Error al revisar órdenes no recibidas:', err.message);
        } finally {
            corriendo = false;
        }
    };

    setTimeout(correr, 60_000);
    setInterval(correr, INTERVALO_MS);
    console.log(`[ComprasVencidas] Órdenes enviadas sin recibirse pasan a Vencida según el plazo de cada proveedor (general ${DIAS_RESPALDO} días si no se configura); revisión cada ${INTERVALO_MS / 3_600_000} h.`);
}
