import { QueryTypes } from 'sequelize';
import { dbPoly } from '../config/db';

// Escrituras de costo / precio hacia PolyDB. Regla: solo se toca la fila (y su fecha) cuando el valor
// CAMBIÓ (subió o bajó). Si se mantuvo, no se actualiza nada.

export type ResultadoPoly = 'INSERTADO' | 'ACTUALIZADO' | 'SIN_CAMBIO';

// Las columnas de PolyDB (almcosprn, almultctn, grpprecin, grpcoston) son numeric(9,2): guardan 2 decimales.
// Se compara a 2 decimales, igual que lo que PolyDB realmente guarda; si no, 43.5037 contra 43.50 se vería
// como "cambio" en cada recepción aunque el costo, ya redondeado, sea el mismo.
const igual = (a: unknown, b: unknown) =>
    Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

/**
 * almacenes1 (empresa 99999, almacén 1): costo promedio y último costo del artículo.
 * Solo escribe si el costo promedio (almcosprn) es distinto al que ya tiene PolyDB, o si la fila no existe.
 */
export async function upsertCostoAlmacenPoly(
    cod_int_artic: number,
    costoNeto: number,
    costoPromedio: number,
): Promise<ResultadoPoly> {
    const [actual] = await dbPoly.query<{ almcosprn: string | number | null }>(`
        SELECT almcosprn FROM public.almacenes1
        WHERE empcdempn = 99999 AND almcdalmn = 1 AND artcdartn = :cod LIMIT 1
    `, { replacements: { cod: cod_int_artic }, type: QueryTypes.SELECT });

    if (actual && actual.almcosprn != null && igual(actual.almcosprn, costoPromedio)) return 'SIN_CAMBIO';

    await dbPoly.query(`
        INSERT INTO public.almacenes1
            (empcdempn, almcdalmn, artcdartn, almultctn, almcfeultd, almcosprn, almexistn)
        VALUES
            (99999, 1, :cod, :costoNeto, NOW(), :costoPromedio, 0)
        ON CONFLICT (empcdempn, almcdalmn, artcdartn)
        DO UPDATE SET
            almultctn = EXCLUDED.almultctn,
            almcfeultd = EXCLUDED.almcfeultd,
            almcosprn = EXCLUDED.almcosprn
    `, { replacements: { cod: cod_int_artic, costoNeto, costoPromedio }, type: QueryTypes.INSERT });

    return actual ? 'ACTUALIZADO' : 'INSERTADO';
}

/**
 * preciogpo: precio y costo por grupo de lista. Solo escribe si el precio o el costo cambiaron
 * (o la fila no existe). `soloActualizar` = no crea la fila si falta.
 */
export async function upsertPrecioGpoPoly(d: {
    codGrupo: number | string;
    codArtic: number;
    precio: number;
    costo: number;
    margen: number;
    soloActualizar?: boolean;
}): Promise<ResultadoPoly> {
    const [actual] = await dbPoly.query<{ grpprecin: string | number | null; grpcoston: string | number | null }>(`
        SELECT grpprecin, grpcoston FROM preciogpo
        WHERE grpcdgrpn = :codGrupo AND artcdartn = :codArtic LIMIT 1
    `, { replacements: { codGrupo: d.codGrupo, codArtic: d.codArtic }, type: QueryTypes.SELECT });

    if (actual && igual(actual.grpprecin, d.precio) && igual(actual.grpcoston, d.costo)) return 'SIN_CAMBIO';
    if (!actual && d.soloActualizar) return 'SIN_CAMBIO';

    const replacements = { codGrupo: d.codGrupo, codArtic: d.codArtic, precio: d.precio, costo: d.costo, margen: d.margen };
    if (actual) {
        await dbPoly.query(`
            UPDATE preciogpo
            SET grpprecin = :precio, grpcoston = :costo, grpmargen = :margen, grpstatuc = 'A', grpfechad = CURRENT_DATE
            WHERE grpcdgrpn = :codGrupo AND artcdartn = :codArtic
        `, { replacements, type: QueryTypes.UPDATE });
        return 'ACTUALIZADO';
    }
    await dbPoly.query(`
        INSERT INTO preciogpo (grpcdgrpn, artcdartn, grpprecin, grpcoston, grpmargen, grpstatuc, grpfechad, grppreofn, grpfecofD, grppzalmn, grpmulOfc)
        VALUES (:codGrupo, :codArtic, :precio, :costo, :margen, 'A', CURRENT_DATE, NULL, NULL, NULL, 'N')
        ON CONFLICT (grpcdgrpn, artcdartn)
        DO UPDATE SET
            grpprecin = EXCLUDED.grpprecin,
            grpcoston = EXCLUDED.grpcoston,
            grpmargen = EXCLUDED.grpmargen,
            grpstatuc = 'A',
            grpfechad = CURRENT_DATE
    `, { replacements, type: QueryTypes.INSERT });
    return 'INSERTADO';
}
