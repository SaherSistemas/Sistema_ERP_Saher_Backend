// src/modules/compras/domain/facturaLotes.classifier.ts

export type ClasificacionStatus = 'OK' | 'OBSERVADO' | 'NEGADO';

export type DiferenciaLoteTipo =
    | 'FALTANTE_LOTE'
    | 'EXTRA_LOTE'
    | 'LOTE_NO_FACTURADO';

export interface DiferenciaLote {
    tipo: DiferenciaLoteTipo;
    key: string;              // "NUMERO|FECHA"
    esperado: number;
    recibido: number;
    faltante?: number;
    extra?: number;
}

export interface ResumenDetalleFactura {
    facturado: number;
    recibido: number;
    negado: number;
    sobrante: number;
    status: ClasificacionStatus;
    diferencias_lotes: DiferenciaLote[];
}

export interface ClasificarDetalleInput {
    cantidad_articulo_facturada?: number | string;

    // Lotes capturados en factura (esperado)
    lotes_factura_compra?: Array<{
        numero_lote?: string | null;
        fecha_caducidad?: string | null; // YYYY-MM-DD
        cantidad_lote?: number | string | null;
    }> | null;

    // Lotes finales (recibidos si existen, si no: factura). Puede venir con nombres distintos.
    lotes_finales?: Array<{
        // recibido
        numerolote_lote?: string | null;
        fechavencimiento_lote?: string | null;
        // factura
        numero_lote?: string | null;
        fecha_caducidad?: string | null;

        cantidad_lote?: number | string | null;
    }> | null;
}

const n = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};

const key = (lote?: string | null, fecha?: string | null) =>
    `${String(lote ?? '').trim()}|${String(fecha ?? '').trim()}`;

const sumCant = (arr: any[] = []) => arr.reduce((a, x) => a + n(x?.cantidad_lote), 0);

const mapLotes = (
    lotes: any[] = [],
    getLote: (x: any) => string | null | undefined,
    getFecha: (x: any) => string | null | undefined
) => {
    const m = new Map<string, number>();
    for (const l of lotes || []) {
        const k = key(getLote(l), getFecha(l));
        m.set(k, (m.get(k) || 0) + n(l?.cantidad_lote));
    }
    return m;
};

const diffMaps = (expected: Map<string, number>, received: Map<string, number>): DiferenciaLote[] => {
    const diffs: DiferenciaLote[] = [];

    for (const [k, exp] of expected.entries()) {
        const rec = received.get(k) || 0;

        if (rec < exp) {
            diffs.push({
                tipo: 'FALTANTE_LOTE',
                key: k,
                esperado: exp,
                recibido: rec,
                faltante: exp - rec,
            });
        }

        if (rec > exp) {
            diffs.push({
                tipo: 'EXTRA_LOTE',
                key: k,
                esperado: exp,
                recibido: rec,
                extra: rec - exp,
            });
        }
    }

    for (const [k, rec] of received.entries()) {
        if (!expected.has(k)) {
            diffs.push({
                tipo: 'LOTE_NO_FACTURADO',
                key: k,
                esperado: 0,
                recibido: rec,
                extra: rec,
            });
        }
    }

    return diffs;
};

/**
 * Clasifica un detalle de factura comparando:
 * - cantidad facturada vs cantidad recibida (lotes_finales)
 * - lotes esperados (lotes_factura_compra) vs lotes recibidos (lotes_finales)
 *
 * Regla:
 * - NEGADO: facturado > recibido
 * - OBSERVADO: no negado pero hay diferencias de lotes
 * - OK: cuadra y no hay diferencias
 */
export function clasificarDetalleFactura(input: ClasificarDetalleInput): ResumenDetalleFactura {
    const facturado = n(input?.cantidad_articulo_facturada);

    const lotesFactura = Array.isArray(input?.lotes_factura_compra) ? input!.lotes_factura_compra! : [];
    const lotesFinales = Array.isArray(input?.lotes_finales) ? input!.lotes_finales! : [];

    const recibido = sumCant(lotesFinales);
    const negado = Math.max(0, facturado - recibido);
    const sobrante = Math.max(0, recibido - facturado);

    const expectedMap = mapLotes(
        lotesFactura,
        (x) => (x?.numero_lote ?? null) as any,
        (x) => (x?.fecha_caducidad ?? null) as any
    );

    const receivedMap = mapLotes(
        lotesFinales,
        (x) => (x?.numerolote_lote ?? x?.numero_lote ?? null) as any,
        (x) => (x?.fechavencimiento_lote ?? x?.fecha_caducidad ?? null) as any
    );

    const diferencias_lotes = diffMaps(expectedMap, receivedMap);

    const status: ClasificacionStatus =
        negado > 0 ? 'NEGADO' :
            diferencias_lotes.length > 0 ? 'OBSERVADO' :
                'OK';

    return {
        facturado,
        recibido,
        negado,
        sobrante,
        status,
        diferencias_lotes,
    };
}

/**
 * Helper opcional para separar listas (para UI)
 */
export function separarDetallesPorStatus<T extends { resumen: { status: ClasificacionStatus } }>(detalles: T[]) {
    const ok: T[] = [];
    const observados: T[] = [];
    const devoluciones: T[] = [];

    for (const d of detalles || []) {
        const st = d?.resumen?.status;
        if (st === 'NEGADO') devoluciones.push(d);
        else if (st === 'OBSERVADO') observados.push(d);
        else ok.push(d);
    }

    return { ok, observados, devoluciones };
}
