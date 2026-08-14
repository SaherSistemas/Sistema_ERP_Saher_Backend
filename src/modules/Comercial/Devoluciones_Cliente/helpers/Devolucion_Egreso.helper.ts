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
}): Promise<EgresoDevolucionResult> {

    const { id_factura, detalles, id_empresa } = params;

    // ── 1. Datos de la factura origen ─────────────────────────────────────────
    const origen = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
    if (!origen) throw new Error(`Factura origen ${id_factura} no encontrada`);
    if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede emitir nota de crédito sobre facturas tipo Ingreso');

    // ── 2. Construir items ────────────────────────────────────────────────────
    const items = detalles.map(d => {
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
            uso_cfdi:          'G02',
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
            const receptor: ReceptorTxt = {
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
