import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

// Una cotización (pedido en status CO) vale 10 días desde que se creó; si pasa ese tiempo
// sin que la autoricen, se cancela (CN) sola.
const VIGENCIA_DIAS = 10;
const INTERVALO_MS = 24 * 60 * 60 * 1000; // una vez al día

let corriendo = false;

export async function cancelarCotizacionesVencidas(): Promise<number> {
    const canceladas = await dbLocal.query<{ cod_int_pedido_alm: string }>(`
        UPDATE pedido_almacen
        SET status_pedido_alm = 'CN', "updatedAt" = NOW()
        WHERE status_pedido_alm = 'CO'
          AND "createdAt" < NOW() - INTERVAL '${VIGENCIA_DIAS} days'
        RETURNING cod_int_pedido_alm
    `, { type: QueryTypes.SELECT });

    if (canceladas.length) {
        console.log(`[Cotizaciones] ${canceladas.length} cotización(es) con más de ${VIGENCIA_DIAS} días canceladas: ${canceladas.map(c => c.cod_int_pedido_alm).join(', ')}`);
    }
    return canceladas.length;
}

export function iniciarVigenciaCotizaciones() {
    const correr = async () => {
        if (corriendo) return;
        corriendo = true;
        try {
            await cancelarCotizacionesVencidas();
        } catch (err: any) {
            console.error('[Cotizaciones] Error al cancelar cotizaciones vencidas:', err.message);
        } finally {
            corriendo = false;
        }
    };

    correr();
    setInterval(correr, INTERVALO_MS);
    console.log(`[Cotizaciones] Vigencia de ${VIGENCIA_DIAS} días; revisión cada ${INTERVALO_MS / 3_600_000} h.`);
}
