import { Transaction } from 'sequelize';
import { ConceptoFacturacion, DatosFacturacionCabecera } from '../interfaces/Facturacion.types';
import { RemisionRepository } from '../../Finanzas/Remisiones/repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../../Finanzas/Remisiones/repositories/Detalle_Remision.repository';
import { CxCRepository } from '../../Finanzas/Cuentas_Por_Cobrar/repositories/CxC.repository';
import { fmt2, fmt4 } from './sat.helper';

export const RFC_PUBLICO_GENERAL = 'XAXX010101000';

export function buildDescripcionConcepto(c: ConceptoFacturacion): string {
    let desc = c.descripcion;
    if (c.lotes?.length) {
        desc += ' - ' + c.lotes
            .map(l => `Lote:${l.lote} Fec/Cad: ${l.fecha_venci} Pzas: ${fmt4(l.cantidad).padStart(13, ' ')}`)
            .join(' ');
    }
    if (c.tasa_iva > 0) desc += ` ${(c.tasa_iva * 100).toFixed(2)}%`;
    return desc;
}

export function calcularTotales(conceptos: ConceptoFacturacion[]) {
    const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
    const totalTraslados = conceptos.reduce((s, c) => s + +(c.subtotal_linea * c.tasa_iva).toFixed(2), 0);
    const totalNeto      = +(subtotal + totalTraslados).toFixed(2);
    return { subtotal: +fmt2(subtotal), iva: +fmt2(totalTraslados), total: totalNeto };
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
    factura_id:      string;
    cab:             Pick<DatosFacturacionCabecera, 'id_pedido_alm' | 'id_cliente_alm' | 'id_agente_alm'>;
    totales:         { subtotal: number; iva: number; total: number };
    conceptos:       ConceptoFacturacion[];
    dias_credito:    number;
    esPublicoGeneral: boolean;
}, t: Transaction): Promise<string | null> {
    const { factura_id, cab, totales, conceptos, dias_credito, esPublicoGeneral } = params;

    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + dias_credito);

    let id_remision: string | null = null;

    if (esPublicoGeneral) {
        const folioRemision = await RemisionRepository.getUltimoFolio();
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
    }, t);

    return id_remision;
}
