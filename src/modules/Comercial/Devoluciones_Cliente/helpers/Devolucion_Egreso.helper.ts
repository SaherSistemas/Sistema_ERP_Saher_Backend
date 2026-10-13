import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { FacturacionRepository } from '../../../Facturas/repositories/Facturacion.repository';
import Facturas from '../../../Facturas/model/Facturas.model';
import Detalle_Factura from '../../../Facturas/model/Detalle_Factura.model';
import { Devolucion_Cliente_Detalle } from '../model/Devolucion_Cliente_Detalle.model';
import { generarTxtEgreso, derivarSeries, EmisorTxt, ReceptorTxt, ConceptoTxt } from '../../../Facturas/helpers/cfdi_txt.helper';
import { fmt2 } from '../../../Facturas/helpers/sat.helper';
import EmpresaSucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import { detectarPublicoGeneral, RFC_PUBLICO_GENERAL } from '../../../Facturas/helpers/factura.helper';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Factura SIN detalle de artículos (migrada / vieja): el egreso se arma solo por el monto,
// repartido en las tasas de IVA que tuvo la factura (mismo criterio que los complementos de pago:
// base16 = iva / 0.16, base0 = subtotal − base16), prorrateado a lo que se devuelve.
function desglosePorTotal(origen: { total_factura: number; subtotal_factura: number; iva_factura: number }, monto: number) {
    const total = Number(origen.total_factura);
    const subtotal = Number(origen.subtotal_factura);
    const iva = Number(origen.iva_factura);
    const p = total > 0 ? Math.min(1, monto / total) : 1;

    const base16Total = iva > 0 ? iva / 0.16 : 0;
    let base16 = r2(base16Total * p);
    let base0 = r2(Math.max(0, subtotal - base16Total) * p);

    // Sin desglose confiable → todo a tasa 0 por el monto
    if (base16 + base0 <= 0) { base0 = r2(monto); base16 = 0; }

    // Ajuste de centavos para que cuadre exacto con el monto devuelto
    const calc = r2(base0 + base16 + r2(base16 * 0.16));
    const diff = r2(monto - calc);
    if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.1) {
        if (base0 > 0) base0 = r2(base0 + diff);
        else base16 = r2(base16 + diff / 1.16);
    }

    const out: { tasa_iva: number; base: number }[] = [];
    if (base0 > 0) out.push({ tasa_iva: 0, base: base0 });
    if (base16 > 0) out.push({ tasa_iva: 0.16, base: base16 });
    return out;
}

const SAT_GENERICO = {
    cve_sat:     '01010101',
    sat_medida:  'H87',
    desc_medida: 'Pieza',
    tasa_iva:    0,
};

export interface EgresoDevolucionResult {
    id_factura_egreso: string;
    folio:             number;
    total:             number;
    ruta_txt?:         string;
}

export async function timbraDevolucionEgreso(params: {
    id_factura:  string;
    detalles:    Devolucion_Cliente_Detalle[];
    id_empresa?: string;
    /** Factura sin detalle de artículos: se genera el egreso solo por este monto (con IVA) */
    solo_total?: number;
}): Promise<EgresoDevolucionResult> {

    const { id_factura, detalles, id_empresa, solo_total } = params;

    // ── 1. Datos de la factura origen ─────────────────────────────────────────
    const origen = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
    if (!origen) throw new Error(`Factura origen ${id_factura} no encontrada`);
    if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede emitir nota de crédito sobre facturas tipo Ingreso');

    // Público General: el egreso va al receptor genérico, igual que sus facturas de ingreso
    const esPublicoGeneral = detectarPublicoGeneral(origen.rfc_cliente, origen.nom_corto_cliente);

    // ── 2. Construir items ────────────────────────────────────────────────────
    const items = solo_total && solo_total > 0
        ? desglosePorTotal(origen, solo_total).map(g => ({
            cve_sat:         SAT_GENERICO.cve_sat,
            sat_medida:      SAT_GENERICO.sat_medida,
            desc_medida:     SAT_GENERICO.desc_medida,
            tasa_iva:        g.tasa_iva,
            precio_unitario: g.base,
            cantidad:        1,
            subtotal_linea:  g.base,
            descripcion:     `Devolucion de mercancia factura ${origen.folio_factura ?? ''} (tasa ${Math.round(g.tasa_iva * 100)}%)`.trim(),
            id_articulo:     null as string | null,
        }))
        : detalles.map(d => {
        const lineaOriginal = origen.detalles?.find(
            (o: any) => o.id_articulo && d.id_articulo && o.id_articulo === d.id_articulo
        );
        const cve_sat     = lineaOriginal?.cve_sat     ?? SAT_GENERICO.cve_sat;
        const sat_medida  = lineaOriginal?.sat_medida  ?? SAT_GENERICO.sat_medida;
        const desc_medida = lineaOriginal?.desc_medida ?? SAT_GENERICO.desc_medida;
        const tasa_iva    = lineaOriginal ? Number(lineaOriginal.tasa_iva) : SAT_GENERICO.tasa_iva;

        const precio_unitario = Number(d.precio_unitario);
        const cantidad        = Number(d.cantidad_devolucion);
        const subtotal_linea  = +(cantidad * precio_unitario).toFixed(2);

        return { cve_sat, sat_medida, desc_medida, tasa_iva, precio_unitario, cantidad, subtotal_linea, descripcion: d.descripcion_articulo, id_articulo: d.id_articulo ?? null };
    });

    const subtotal = items.reduce((s, i) => s + i.subtotal_linea, 0);
    const iva      = items.reduce((s, i) => s + +(i.subtotal_linea * i.tasa_iva).toFixed(2), 0);
    const total    = +(subtotal + iva).toFixed(2);
    const folio    = await FacturacionRepository.getSiguienteFolio();

    // ── 3. Registrar en BD ────────────────────────────────────────────────────
    const t = await dbLocal.transaction();
    let id_factura_egreso: string;

    try {
        const facturaEgreso = await Facturas.create({
            id_factura:        uuidv4(),
            folio_factura:     String(folio),
            tipo_cfdi:         'E',
            origen_factura:    'DEV',
            fecha_emision:     new Date(),
            subtotal_factura:  +subtotal.toFixed(2),
            iva_factura:       +iva.toFixed(2),
            total_factura:     total,
            estatus_factura:   'PEN',
            id_cliente_alm:    origen.id_cliente_alm,
            id_forma_pago:     origen.id_forma_pago,
            uso_cfdi:          esPublicoGeneral ? 'S01' : 'G02',
            id_factura_origen: id_factura,
            uuid_relacionado:  origen.uuid_sat,
        }, { transaction: t });

        id_factura_egreso = facturaEgreso.id_factura;

        await Detalle_Factura.bulkCreate(
            items.map(i => ({
                id_detalle_fact:      uuidv4(),
                id_factura:           id_factura_egreso,
                id_articulo:          i.id_articulo,
                descripcion_articulo: i.descripcion,
                cantidad_facturada:   i.cantidad,
                precio_artic:         i.precio_unitario,
                subtotal:             i.subtotal_linea,
                tasa_iva:             i.tasa_iva,
                importe_iva:          +(i.subtotal_linea * i.tasa_iva).toFixed(2),
            })),
            { transaction: t }
        );

        await t.commit();

    } catch (err) {
        await t.rollback();
        throw err;
    }

    // ── 4. Generar .txt ───────────────────────────────────────────────────────
    let ruta_txt: string | undefined;
    try {
        const empresa = id_empresa
            ? await EmpresaSucursal.findByPk(id_empresa, {
                attributes: ['nom_empre', 'rfc_empre', 'regimen_fiscal_empre', 'serie_facturacion_empre', 'lugar_expedicion'],
                raw: true,
              }) as any
            : null;

        if (empresa) {
            const emisor: EmisorTxt = {
                nom_empre:            empresa.nom_empre,
                rfc_empre:            empresa.rfc_empre,
                regimen_fiscal_empre: empresa.regimen_fiscal_empre ?? '601',
                serie_ingreso:        empresa.serie_facturacion_empre ?? 'FSH',
                lugar_expedicion:     empresa.lugar_expedicion ?? '80160',
            };
            const receptor: ReceptorTxt = esPublicoGeneral ? {
                razon_social:     'VENTA AL PUBLICO EN GENERAL',
                rfc:              RFC_PUBLICO_GENERAL,
                domicilio_fiscal: empresa.lugar_expedicion ?? '80160',
                regimen_fiscal:   '616',
                uso_cfdi:         'S01',
            } : {
                razon_social:    origen.razon_social_cliente?.toUpperCase(),
                rfc:             origen.rfc_cliente,
                domicilio_fiscal: origen.domicilio_fiscal,
                regimen_fiscal:  origen.regimen_fiscal_cliente ?? '616',
                uso_cfdi:        'G02',
            };
            const conceptosTxt: ConceptoTxt[] = items.map(i => ({
                cve_sat:         i.cve_sat,
                sat_medida:      i.sat_medida,
                desc_medida:     i.desc_medida,
                cod_barras:      '001',
                cantidad:        i.cantidad,
                descripcion:     i.descripcion,
                precio_unitario: i.precio_unitario,
                descuento:       0,
                subtotal_linea:  i.subtotal_linea,
                tasa_iva:        i.tasa_iva,
                impuesto_sat:    '002',
                tipo_factor:     'Tasa',
            }));
            const series = derivarSeries(emisor.serie_ingreso);
            const { ruta } = generarTxtEgreso({
                emisor, receptor, folio,
                uuid_relacionado: origen.uuid_sat ?? '',
                conceptos: conceptosTxt,
                leyenda: `Nota de Credito por Devolucion de Factura ${series.ingreso}${origen.folio_factura ?? folio}`,
            });
            ruta_txt = ruta;
        }
    } catch (txtErr: any) {
        console.warn('[timbraDevolucionEgreso] No se pudo generar .txt:', txtErr.message);
    }

    return { id_factura_egreso, folio, total, ruta_txt };
}
