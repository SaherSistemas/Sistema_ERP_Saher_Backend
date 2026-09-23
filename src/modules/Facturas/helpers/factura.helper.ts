import { Transaction, QueryTypes } from 'sequelize';
import { ConceptoFacturacion, DatosFacturacionCabecera } from '../interfaces/Facturacion.types';
import { RemisionRepository } from '../../Finanzas/Remisiones/repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../../Finanzas/Remisiones/repositories/Detalle_Remision.repository';
import { CxCRepository } from '../../Finanzas/Cuentas_Por_Cobrar/repositories/CxC.repository';
import { fmt2, fmt4 } from './sat.helper';
import { dbLocal } from '../../../config/db';
import Detalle_Factura from '../model/Detalle_Factura.model';
import { ImpuestoDocumentoPagoTxt } from './cfdi_txt.helper';

export const RFC_PUBLICO_GENERAL = 'XAXX010101000';

// Detecta si un pedido debe facturarse como Público General:
//   1. RFC es XAXX010101000
//   2. RFC vacío o con menos de 12 caracteres (inválido)
//   3. nom_corto contiene "Abarrot" (clientes tipo abarrotes = mostrador)
export function detectarPublicoGeneral(rfc: string | null | undefined, nomCorto: string | null | undefined): boolean {
    const rfcUp = (rfc ?? '').trim().toUpperCase();
    if (rfcUp === RFC_PUBLICO_GENERAL) return true;
    if (rfcUp.length < 12) return true;
    if ((nomCorto ?? '').toLowerCase().includes('abarrot')) return true;
    return false;
}

export function buildDescripcionConcepto(c: ConceptoFacturacion): string {
    let desc = c.descripcion.trim();
    if (c.lotes?.length) {
        const lotesStr = c.lotes
            .map(l => `L:${l.lote} CAD:${l.fecha_venci} PZAS:${l.cantidad}`)
            .join(' / ');
        desc += ` | ${lotesStr}`;
    }
    const importe_iva = +(c.subtotal_linea * c.tasa_iva).toFixed(2);
    if (c.tasa_iva > 0) desc += ` | IVA:$${fmt2(importe_iva)}`;
    return desc;
}

export function calcularTotales(conceptos: ConceptoFacturacion[]) {
    const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
    const totalTraslados = conceptos.reduce((s, c) => s + +(c.subtotal_linea * c.tasa_iva).toFixed(2), 0);
    const totalNeto      = +(subtotal + totalTraslados).toFixed(2);
    return { subtotal: +fmt2(subtotal), iva: +fmt2(totalTraslados), total: totalNeto };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Desglosa el IVA de una factura por su TASA REAL y prorratea base/importe al
//  monto de un pago (complemento de pago / REP). Compartida entre Facturacion
//  y CxC — antes cada lado tenía su propia copia asumiendo una sola tasa (16%)
//  para toda la factura, lo cual infla la base gravada cuando la factura
//  mezcla productos a 0% y 16% (ej. farmacia).
//
//  Camino 1 (facturas con detalle_factura — todas las generadas por el
//  sistema): agrupa los renglones reales por tasa_iva, la fuente más precisa.
//
//  Camino 2 (facturas de migración, sin detalle_factura): se deriva
//  algebraicamente desde los agregados de la factura:
//    base16_total = iva_factura / 0.16
//    base0_total  = subtotal_factura - base16_total
//  No distingue una tercera tasa (8%/exento) en facturas migradas, pero
//  cubre el caso real de este negocio (16% + 0%).
//
//  Se redondea a 2 decimales AQUÍ (el valor que de verdad se imprime por documento
//  en DOCTOS_PAGOS_TRASLADOS). Antes no se redondeaba aquí, con la idea de que el
//  total del header (INFO_PAGOS/PAGOS_IMPUESTOS_TRASLADOS) saliera más "exacto" al
//  redondear una sola vez, ya sumado — pero eso rompe algo más importante: cuando un
//  recibo cubre varias facturas, esa suma sin redondear no coincide con la suma real
//  de lo que se imprime en cada DPx (cada uno YA se ve redondeado con fmt2 al
//  escribirse). El PAC valida que el header cuadre con la suma de los documentos, así
//  que lo que debe coincidir es la suma de las partes redondeadas, no la del monto
//  "ideal" sin redondear. Por eso ahora se redondea una sola vez, aquí, y tanto el
//  header como cada DPx usan ese mismo número — nunca se desalinean.
// ─────────────────────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function calcularImpuestosProporcionalesPago(
    id_factura: string,
    monto_pagado: number,
    total_factura: number,
    subtotal_factura: number,
    iva_factura: number,
): Promise<ImpuestoDocumentoPagoTxt[]> {
    const grupos = await Detalle_Factura.findAll({
        where: { id_factura },
        attributes: [
            'tasa_iva',
            [dbLocal.fn('SUM', dbLocal.col('subtotal')), 'base'],
            [dbLocal.fn('SUM', dbLocal.col('importe_iva')), 'importe'],
        ],
        group: ['tasa_iva'],
        raw: true,
    }) as unknown as { tasa_iva: string; base: string; importe: string }[];

    const proporcion = total_factura > 0 ? monto_pagado / total_factura : 1;

    if (grupos.length) {
        return grupos.map(g => ({
            tasa:    Number(g.tasa_iva),
            base:    round2(Number(g.base)    * proporcion),
            importe: round2(Number(g.importe) * proporcion),
        }));
    }

    // Fallback para facturas de migración (sin detalle_factura)
    const base16Total = iva_factura > 0 ? iva_factura / 0.16 : 0;
    const base0Total   = Math.max(subtotal_factura - base16Total, 0);

    const resultado: ImpuestoDocumentoPagoTxt[] = [];
    if (base16Total > 0) {
        resultado.push({
            tasa:    0.16,
            base:    round2(base16Total * proporcion),
            importe: round2(iva_factura * proporcion),
        });
    }
    if (base0Total > 0) {
        resultado.push({ tasa: 0, base: round2(base0Total * proporcion), importe: 0 });
    }
    if (!resultado.length) {
        // Factura de migración sin subtotal/iva registrado — último recurso.
        resultado.push({ tasa: 0, base: round2(monto_pagado), importe: 0 });
    }
    return resultado;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Resuelve qué fila(s) de `factura_pago_cfdi` corresponden a una fila "P"
//  (folio reservado del complemento de pago) en `facturas`. Compartido entre
//  CxC.service.ts (regenerar TXT) y Facturacion.repository.ts (detalle de
//  factura) — antes cada lado tenía su propia copia de este matching.
//
//  Camino 1 (correcto, recibos nuevos): la fila "P" guarda su propio
//  numero_recibo. Se buscan TODOS los factura_pago_cfdi cuyo pago_cxc
//  pertenezca a ese mismo recibo — es la clave real, sin adivinar nada.
//
//  Camino 2 (fallback, recibos viejos sin numero_recibo guardado):
//    2a) id_factura_origen ya apunta a la factura pagada (1 documento), y su
//        monto ya cuadra con el total → recibo de 1 sola factura.
//    2b) si no cuadra, es multi-factura: se busca por RFC + ventana de tiempo.
//        OJO: esto puede juntar de más si dos recibos DISTINTOS del mismo RFC
//        se aplicaron casi al mismo segundo — por eso ya no es el camino
//        principal, solo el respaldo para las filas "P" creadas antes de
//        que existiera numero_recibo.
// ─────────────────────────────────────────────────────────────────────────────
const RFC_GENERICOS_PAGO = new Set(['XAXX010101000', 'XEXX010101000']);

export async function resolverGrupoPagoP(fp: {
    id_factura: string;               // id de la fila "P" en `facturas`
    id_factura_origen: string | null;
    id_cliente_alm: string;
    total_factura: number;
    numero_recibo?: string | null;
}): Promise<{ id_pago_cfdi: string; id_factura_origen: string }[]> {
    const cuadra = (filas: { monto_pagado: string }[]) =>
        Math.abs(filas.reduce((s, f) => s + Number(f.monto_pagado), 0) - fp.total_factura) < 0.02;

    // Camino 1: numero_recibo es la clave real del recibo — sin ambigüedad posible.
    if (fp.numero_recibo) {
        const porRecibo = await dbLocal.query<{ id_pago_cfdi: string; id_factura: string; monto_pagado: string }>(`
            SELECT fpc.id_pago_cfdi, fpc.id_factura, fpc.monto_pagado
            FROM factura_pago_cfdi fpc
            JOIN pago_cxc pc ON pc.id_pago_cxc = fpc.id_pago_cxc
            WHERE pc.numero_recibo = :numero_recibo
        `, { replacements: { numero_recibo: fp.numero_recibo }, type: QueryTypes.SELECT });
        if (porRecibo.length) {
            return porRecibo.map(r => ({ id_pago_cfdi: r.id_pago_cfdi, id_factura_origen: r.id_factura }));
        }
    }

    // Camino 2a (fallback): 1 sola factura pagada — id_factura_origen ya apunta a ella.
    if (fp.id_factura_origen) {
        const rows = await dbLocal.query<{ id_pago_cfdi: string; id_factura: string; monto_pagado: string }>(
            `SELECT id_pago_cfdi, id_factura, monto_pagado FROM factura_pago_cfdi WHERE id_factura = :id_factura_origen`,
            { replacements: { id_factura_origen: fp.id_factura_origen }, type: QueryTypes.SELECT }
        );
        if (rows.length && cuadra(rows)) {
            return rows.map(r => ({ id_pago_cfdi: r.id_pago_cfdi, id_factura_origen: r.id_factura }));
        }
    }

    // Camino 2b (fallback): recibo multi-factura sin numero_recibo guardado — por RFC + ventana de 5s.
    const [clienteP] = await dbLocal.query<{ rfc_cliente_alm: string | null }>(
        `SELECT rfc_cliente_alm FROM cliente_almacen WHERE id_cliente_alm = :id_cliente_alm`,
        { replacements: { id_cliente_alm: fp.id_cliente_alm }, type: QueryTypes.SELECT }
    );
    const rfcP = (clienteP?.rfc_cliente_alm ?? '').trim().toUpperCase();
    const mismoRfc = !!rfcP && !RFC_GENERICOS_PAGO.has(rfcP);

    const filas = await dbLocal.query<{ id_pago_cfdi: string; id_factura: string; monto_pagado: string }>(`
        SELECT fp.id_pago_cfdi, fp.id_factura, fp.monto_pagado
        FROM factura_pago_cfdi fp
        JOIN facturas fi        ON fi.id_factura = fp.id_factura
        JOIN cliente_almacen ca ON ca.id_cliente_alm = fi.id_cliente_alm
        WHERE (${mismoRfc ? 'ca.rfc_cliente_alm = :rfcP' : 'fi.id_cliente_alm = :id_cliente_alm'})
          AND ABS(EXTRACT(EPOCH FROM (
                fp."createdAt" - (SELECT "createdAt" FROM facturas WHERE id_factura = :id_factura_p)
          ))) < 5
        ORDER BY fp."createdAt"
    `, {
        replacements: { rfcP, id_cliente_alm: fp.id_cliente_alm, id_factura_p: fp.id_factura },
        type: QueryTypes.SELECT,
    });

    if (!filas.length || !cuadra(filas)) return [];
    return filas.map(f => ({ id_pago_cfdi: f.id_pago_cfdi, id_factura_origen: f.id_factura }));
}

export function particionarConceptos(
    conceptos: ConceptoFacturacion[],
    limite: number,
): ConceptoFacturacion[][] {
    if (limite <= 0) return [conceptos];

    const buckets: ConceptoFacturacion[][] = [];
    let currentBucket: ConceptoFacturacion[] = [];
    let currentTotal = 0;

    for (const c of conceptos) {
        const lineaTotal = +(c.subtotal_linea * (1 + c.tasa_iva)).toFixed(2);

        if (lineaTotal > limite) {
            // Artículo supera el límite por sí solo → va en su propia factura
            if (currentBucket.length > 0) {
                buckets.push(currentBucket);
                currentBucket = [];
                currentTotal = 0;
            }
            buckets.push([c]);
        } else if (+(currentTotal + lineaTotal).toFixed(2) > limite) {
            // No cabe en el bucket actual → cerrar y abrir uno nuevo
            buckets.push(currentBucket);
            currentBucket = [c];
            currentTotal = lineaTotal;
        } else {
            currentBucket.push(c);
            currentTotal = +(currentTotal + lineaTotal).toFixed(2);
        }
    }

    if (currentBucket.length > 0) buckets.push(currentBucket);
    return buckets;
}

export async function crearCxCyRemision(params: {
    factura_id:       string;
    cab:              Pick<DatosFacturacionCabecera, 'id_pedido_alm' | 'id_cliente_alm' | 'id_agente_alm'>;
    totales:          { subtotal: number; iva: number; total: number };
    conceptos:        ConceptoFacturacion[];
    dias_credito:     number;
    esPublicoGeneral: boolean;
    forzar_credito?:  boolean;
    autorizacion?: {
        usuario_autoriza:     string;
        id_usuario_autoriza:  string | null;
        id_empleado_solicita: string | null;
        id_pedido_alm:        string;
        id_factura:           string | null;
    };
}, t: Transaction): Promise<string | null> {
    const { factura_id, cab, totales, conceptos, dias_credito, esPublicoGeneral, forzar_credito, autorizacion } = params;

    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + dias_credito);

    let id_remision: string | null = null;

    if (esPublicoGeneral) {
        const folioRemision = await RemisionRepository.getUltimoFolio(t);
        const remision      = await RemisionRepository.create({
            id_factura:        factura_id,
            id_pedido_alm:     cab.id_pedido_alm,
            id_cliente_alm:    cab.id_cliente_alm,
            id_agente:         cab.id_agente_alm,
            dias_credito,
            subtotal_remision: totales.subtotal,
            iva_remision:      totales.iva,
            total_remision:    totales.total,
            notas:             null,
        }, folioRemision, t);

        await Detalle_RemisionRepository.createMultiple(
            remision.id_remision,
            conceptos.map(c => ({
                id_articulo:          c.id_articulo,
                descripcion_articulo: c.descripcion,
                cantidad:             c.cantidad,
                precio_unitario:      c.precio_unitario,
                subtotal:             c.subtotal_linea,
                tasa_iva:             c.tasa_iva,
                importe_iva:          +(c.subtotal_linea * c.tasa_iva).toFixed(2),
            })),
            t
        );

        id_remision = remision.id_remision;
    }

    await CxCRepository.create({
        id_factura:        esPublicoGeneral ? null : factura_id,
        id_remision,
        id_cliente_alm:    cab.id_cliente_alm,
        monto_total:       totales.total,
        fecha_vencimiento,
        dias_credito,
        forzar_credito,
        autorizacion,
    }, t);

    return id_remision;
}
