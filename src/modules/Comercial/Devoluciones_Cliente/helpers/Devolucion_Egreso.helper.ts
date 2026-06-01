/**
 * Devolucion_Egreso.helper.ts
 *
 * Genera y timbra el CFDI tipo-E (egreso / nota de crédito fiscal)
 * cuando se aprueba una devolución de cliente.
 *
 * Flujo:
 *   1. Obtiene datos de la factura origen (uuid_sat, cliente, conceptos con claves SAT).
 *   2. Construye los items del CFDI-E a partir de los detalles de la devolución.
 *      - Si el artículo tiene id_articulo → toma clave SAT, tasa IVA y unidad de la factura.
 *      - Si no tiene id_articulo (edge case) → usa clave genérica con IVA 0.
 *   3. Llama a FacturAPI para timbrar.
 *   4. Registra el CFDI-E en la tabla `facturas` (tipo_cfdi = 'E').
 *   5. Devuelve { id_factura_egreso, uuid_cfdi_egreso, folio, total }.
 */

import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { facturapiClient } from '../../../../helpers/facturapi.helper';
import { FacturacionRepository } from '../../../Facturas/repositories/Facturacion.repository';
import Facturas from '../../../Facturas/model/Facturas.model';
import Detalle_Factura from '../../../Facturas/model/Detalle_Factura.model';
import { normalizarClaveUnidad } from '../../../Facturas/helpers/sat.helper';
import { Devolucion_Cliente_Detalle } from '../model/Devolucion_Cliente_Detalle.model';

// ── SAT genérico para artículos sin catálogo ────────────────────────────────
const SAT_GENERICO = {
    cve_sat:      '01010101', // no existe en catálogo — SAT acepta con RelatedDocument
    sat_medida:   'H87',
    desc_medida:  'Pieza',
    tasa_iva:     0,
    impuesto_sat: 'IVA',
};

export interface EgresoDevolucionResult {
    id_factura_egreso: string;
    uuid_cfdi_egreso:  string;
    folio:             number;
    total:             number;
}

export async function timbraDevolucionEgreso(params: {
    id_factura:   string;          // ID de la factura origen (tipo I)
    detalles:     Devolucion_Cliente_Detalle[];
}): Promise<EgresoDevolucionResult> {

    const { id_factura, detalles } = params;

    // ── 1. Obtener datos de la factura origen ──────────────────────────────
    const origen = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
    if (!origen) throw new Error(`Factura origen ${id_factura} no encontrada`);
    if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede emitir nota de crédito sobre facturas tipo Ingreso');
    if (!origen.uuid_sat) throw new Error('La factura origen no está timbrada (sin UUID SAT)');

    // ── 2. Construir items del CFDI-E ──────────────────────────────────────
    const items = detalles.map(d => {
        // Buscar la línea correspondiente en la factura origen
        const lineaOriginal = origen.detalles?.find(
            (o: any) => o.id_articulo && d.id_articulo && o.id_articulo === d.id_articulo
        );

        const cve_sat     = lineaOriginal?.cve_sat      ?? SAT_GENERICO.cve_sat;
        const sat_medida  = lineaOriginal?.sat_medida   ?? SAT_GENERICO.sat_medida;
        const desc_medida = lineaOriginal?.desc_medida  ?? SAT_GENERICO.desc_medida;
        const tasa_iva    = lineaOriginal ? Number(lineaOriginal.tasa_iva) : SAT_GENERICO.tasa_iva;

        const precio_unitario = Number(d.precio_unitario);
        const cantidad        = Number(d.cantidad_devolucion);

        return {
            facturapi: {
                quantity: cantidad,
                product: {
                    description:  d.descripcion_articulo,
                    product_key:  cve_sat,
                    price:        +precio_unitario.toFixed(2),
                    tax_included: false,
                    unit_key:     normalizarClaveUnidad(sat_medida),
                    unit_name:    desc_medida,
                    taxes: tasa_iva > 0
                        ? [{ type: 'IVA', rate: tasa_iva, factor: 'Tasa' }]
                        : [],
                },
            },
            // Para registrar en detalle_factura
            db: {
                id_articulo:     d.id_articulo ?? null,
                descripcion:     d.descripcion_articulo,
                cantidad,
                precio_unitario,
                subtotal_linea:  +(cantidad * precio_unitario).toFixed(2),
                tasa_iva,
            },
        };
    });

    const subtotal = items.reduce((s, i) => s + i.db.subtotal_linea, 0);
    const iva      = items.reduce((s, i) => s + +(i.db.subtotal_linea * i.db.tasa_iva).toFixed(2), 0);
    const total    = +(subtotal + iva).toFixed(2);

    // ── 3. Obtener siguiente folio ─────────────────────────────────────────
    const folio = await FacturacionRepository.getSiguienteFolio();

    // ── 4. Registrar CFDI-E en BD (estatus PEN hasta confirmar timbrado) ───
    const t = await dbLocal.transaction();
    let id_factura_egreso: string;

    try {
        const facturaEgreso = await Facturas.create({
            id_factura:       uuidv4(),
            folio_factura:    String(folio),
            tipo_cfdi:        'E',
            origen_factura:   'DEV',           // nuevo origen: devolución
            fecha_emision:    new Date(),
            subtotal_factura: +subtotal.toFixed(2),
            iva_factura:      +iva.toFixed(2),
            total_factura:    total,
            estatus_factura:  'PEN',
            id_cliente_alm:   origen.id_cliente_alm,
            id_forma_pago:    origen.id_forma_pago,
            uso_cfdi:         'G02',
            id_factura_origen: id_factura,
            uuid_relacionado:  origen.uuid_sat,
        }, { transaction: t });

        id_factura_egreso = facturaEgreso.id_factura;

        // Registrar detalles
        await Detalle_Factura.bulkCreate(
            items.map(i => ({
                id_detalle_fact:      uuidv4(),
                id_factura:           id_factura_egreso,
                id_articulo:          i.db.id_articulo,
                descripcion_articulo: i.db.descripcion,
                cantidad_facturada:   i.db.cantidad,
                precio_artic:         i.db.precio_unitario,
                subtotal:             i.db.subtotal_linea,
                tasa_iva:             i.db.tasa_iva,
                importe_iva:          +(i.db.subtotal_linea * i.db.tasa_iva).toFixed(2),
            })),
            { transaction: t }
        );

        await t.commit();

    } catch (err) {
        await t.rollback();
        throw err;
    }

    // ── 5. Timbrar en FacturAPI (fuera de transacción) ─────────────────────
    try {
        const respuesta = await (facturapiClient.invoices as any).create({
            type:     'E',
            customer: {
                legal_name: origen.razon_social_cliente,
                tax_id:     origen.rfc_cliente,
                tax_system: origen.regimen_fiscal_cliente,
                address:    { zip: origen.domicilio_fiscal },
            },
            items: items.map(i => i.facturapi),
            payment_form:      origen.id_forma_pago,
            use:               'G02',
            related_documents: [{
                relationship: '01',
                documents: [origen.uuid_sat],   // array de strings UUID, no objetos
            }],
            currency: 'MXN',
        });

        // Actualizar factura con UUID y URLs
        await Facturas.update({
            uuid_sat:        respuesta.uuid,
            fecha_timbrado:  new Date(respuesta.stamp?.date ?? Date.now()),
            pdf_url:         respuesta.pdf_url,
            xml_url:         respuesta.xml_url,
            estatus_factura: 'TIM',
            estatus_sat:     'vigente',
        }, { where: { id_factura: id_factura_egreso } });

        return {
            id_factura_egreso,
            uuid_cfdi_egreso: respuesta.uuid as string,
            folio,
            total,
        };

    } catch (err: any) {
        // Registro guardado como PEN — se puede reintentar con /facturas/reintento
        throw new Error(
            `CFDI-E guardado (PEN) pero falló el timbrado en FacturAPI: ${err.message}`
        );
    }
}
