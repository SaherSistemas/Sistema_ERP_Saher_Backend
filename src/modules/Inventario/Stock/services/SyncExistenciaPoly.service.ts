import { QueryTypes } from 'sequelize';
import { dbLocal, dbPoly } from '../../../../config/db';

// Mantiene almacenes1.almexistn (PolyDB) al día con la existencia real del ERP
// (SUM de stock_ubicacion_lote por artículo) para la empresa 20 / almacén 1.
// Mismo patrón que upsertCostoAlmacenPoly (src/utils/polyCostos.ts) pero para
// existencia en vez de costo, corriendo periódico en vez de por movimiento —
// así no hay que enganchar el sync en cada flujo que toca stock (venta, compra,
// ajuste, traspaso, devolución...).

const EMPRESA_SYS_ANTERIOR = 20;
const ALMACEN = 1;
const INTERVALO_MS = 5 * 60 * 1000; // 5 min
const LOTE = 500; // artículos por INSERT, para no mandar un statement gigante

let corriendo = false;

async function sincronizarExistenciaPoly() {
    const [empresa] = await dbLocal.query<{ id_empre: string }>(`
        SELECT id_empre FROM empresa_sucursal WHERE id_empresa_sys_anterior::text = :emp LIMIT 1
    `, { replacements: { emp: String(EMPRESA_SYS_ANTERIOR) }, type: QueryTypes.SELECT });

    if (!empresa?.id_empre) {
        console.warn(`[SyncExistenciaPoly] No se encontró empresa_sucursal con id_empresa_sys_anterior=${EMPRESA_SYS_ANTERIOR}`);
        return;
    }

    // LEFT JOIN desde articulo (no desde stock_ubicacion_lote): un artículo sin
    // renglones de stock para esta empresa debe sincronizar existencia=0, no
    // quedar fuera del recálculo y dejar en PolyDB un valor viejo desactualizado.
    const filas = await dbLocal.query<{ cod_int_artic: number; existencia: string }>(`
        SELECT a.cod_int_artic, COALESCE(SUM(s.cantidad), 0) AS existencia
        FROM articulo a
        LEFT JOIN stock_ubicacion_lote s
            ON s.id_articulo = a.id_artic AND s.id_empresa_sucursal = :id_empresa_sucursal
        WHERE a.cod_int_artic IS NOT NULL
        GROUP BY a.cod_int_artic
    `, { replacements: { id_empresa_sucursal: empresa.id_empre }, type: QueryTypes.SELECT });

    if (!filas.length) return;

    for (let i = 0; i < filas.length; i += LOTE) {
        const bloque = filas.slice(i, i + LOTE);
        const values = bloque.map((_, idx) => `(:emp, :alm, :cod${idx}, :exi${idx})`).join(', ');
        const replacements: Record<string, any> = { emp: EMPRESA_SYS_ANTERIOR, alm: ALMACEN };
        bloque.forEach((f, idx) => {
            replacements[`cod${idx}`] = f.cod_int_artic;
            replacements[`exi${idx}`] = Number(f.existencia);
        });

        await dbPoly.query(`
            INSERT INTO public.almacenes1 (empcdempn, almcdalmn, artcdartn, almexistn)
            VALUES ${values}
            ON CONFLICT (empcdempn, almcdalmn, artcdartn)
            DO UPDATE SET almexistn = EXCLUDED.almexistn
            WHERE public.almacenes1.almexistn IS DISTINCT FROM EXCLUDED.almexistn
        `, { replacements, type: QueryTypes.INSERT });
    }

    console.log(`[SyncExistenciaPoly] ${filas.length} artículo(s) revisados (empresa ${EMPRESA_SYS_ANTERIOR}, almacén ${ALMACEN}).`);
}

export function iniciarSyncExistenciaPoly() {
    const correr = async () => {
        if (corriendo) return;
        corriendo = true;
        try {
            await sincronizarExistenciaPoly();
        } catch (err: any) {
            console.error('[SyncExistenciaPoly] Error:', err.message);
        } finally {
            corriendo = false;
        }
    };

    correr();
    setInterval(correr, INTERVALO_MS);
    console.log(`[SyncExistenciaPoly] Programado cada ${INTERVALO_MS / 60000} min (empresa ${EMPRESA_SYS_ANTERIOR}, almacén ${ALMACEN}).`);
}
