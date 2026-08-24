import fs from 'fs';
import path from 'path';
import { fmt2, fmt4 } from './sat.helper';
import { RUTA_FACTURACION } from './pdf.helper';

function asegurarDirectorio() {
    if (!fs.existsSync(RUTA_FACTURACION))
        fs.mkdirSync(RUTA_FACTURACION, { recursive: true });
}

function escribirTxt(nombreArchivo: string, lineas: string[]): string {
    asegurarDirectorio();
    const ruta = path.join(RUTA_FACTURACION, nombreArchivo);
    fs.writeFileSync(ruta, lineas.join('\r\n'), 'latin1');
    return ruta;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGRESO (FAC)
// ─────────────────────────────────────────────────────────────────────────────
export interface ConceptoTxt {
    cve_sat: string;
    sat_medida: string;
    desc_medida: string;
    cod_barras: string;
    cantidad: number;
    descripcion: string;
    precio_unitario: number;
    descuento: number;
    subtotal_linea: number;
    tasa_iva: number;
    impuesto_sat: string;
    tipo_factor: string;
    lotes?: { lote: string; fecha_venci: string; cantidad: number }[];
}

export interface EmisorTxt {
    nom_empre: string;
    rfc_empre: string;
    regimen_fiscal_empre: string;
    serie_ingreso: string;   // ej. 'FSH' — las otras se derivan automáticamente
    lugar_expedicion: string;
}

/** Deriva series de Egreso y Pago desde la serie base de Ingreso (FSH → NSH, CSH) */
export function derivarSeries(serieIngreso: string) {
    const base = serieIngreso ?? 'FSH';
    return {
        ingreso: base,
        egreso: 'N' + base.slice(1),   // FSH → NSH
        pago: 'C' + base.slice(1),   // FSH → CSH
    };
}

export interface ReceptorTxt {
    razon_social: string;
    rfc: string;
    domicilio_fiscal: string;
    regimen_fiscal: string;
    uso_cfdi: string;
}

export function generarTxtIngreso(opts: {
    emisor: EmisorTxt;
    receptor: ReceptorTxt;
    folio: number;
    forma_pago: string;
    metodo_pago: string;
    conceptos: ConceptoTxt[];
    leyenda: string;
    nombreArchivo?: string;
}): { ruta: string; contenido: string } {

    const { emisor, receptor, folio, forma_pago, metodo_pago, conceptos, leyenda } = opts;

    const subtotal = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
    const totalTraslados = conceptos.reduce((s, c) => s + +(c.subtotal_linea * c.tasa_iva).toFixed(2), 0);
    const totalNeto = +(subtotal + totalTraslados).toFixed(2);

    const mapaImpuestos = new Map<number, { subtotalTasa: number; importeIva: number; ref: ConceptoTxt }>();
    for (const c of conceptos) {
        const entry = mapaImpuestos.get(c.tasa_iva) ?? { subtotalTasa: 0, importeIva: 0, ref: c };
        entry.subtotalTasa += c.subtotal_linea;
        entry.importeIva += +(c.subtotal_linea * c.tasa_iva).toFixed(2);
        mapaImpuestos.set(c.tasa_iva, entry);
    }

    const L: string[] = [];
    L.push('[DATOS_EMISOR]');
    L.push(`NOMBRE1: ${emisor.nom_empre}`);
    L.push(`REGIMENFISCAL: ${emisor.regimen_fiscal_empre}`);
    L.push(`RFC1: ${emisor.rfc_empre}`);
    L.push('[/DATOS_EMISOR]', '');

    L.push('[DATOS_RECEPTOR]');
    L.push(`NOMBRE2: ${receptor.razon_social?.toUpperCase()}`);
    L.push(`RFC2: ${receptor.rfc}`);
    L.push(`DOMICILIOFISCAL: ${receptor.domicilio_fiscal}`);
    L.push(`REGIMENFISCAL2: ${receptor.regimen_fiscal ?? '616'}`);
    L.push(`USOCFDI: ${receptor.uso_cfdi}`);
    L.push('[/DATOS_RECEPTOR]', '');

    L.push('[DATOS_CFD]');
    const series = derivarSeries(emisor.serie_ingreso);
    L.push(`FOLIO: ${folio}`);
    L.push(`SERIE: ${series.ingreso}`);
    L.push(`LUGAREXPEDICION: ${emisor.lugar_expedicion}`);
    L.push('TIPO_COMPROBANTE: I');
    L.push(`FORMAPAGO: ${forma_pago}`);
    L.push(`METODOPAGO: ${metodo_pago}`);
    L.push('NUMCTAPAGO: ');
    L.push('DESCUENTO: 0.00');
    L.push('MOTIVODESCUENTO: _');
    L.push('MONEDA: MXN');
    L.push('TIPOCAMBIO: 1');
    L.push('TOTALRETENIDOS: 0.00');
    L.push(`TOTALTRASLADOS: ${fmt2(totalTraslados)}`);
    L.push(`SUBTOTAL: ${fmt2(subtotal)}`);
    L.push(`TOTALNETO: ${fmt2(totalNeto)}`);
    L.push(`LEYENDA: ${leyenda}`);
    L.push('OCULTAR_UUID: 1');
    L.push('VALIDEZ_OBLIGACIONES: 2');
    L.push('[/DATOS_CFD]', '');

    L.push('[CONCEPTOS]');
    conceptos.forEach((c, i) => {
        let desc = c.descripcion.trim();
        if (c.lotes?.length) {
            const lotesStr = c.lotes.map(l => `L:${l.lote} CAD:${l.fecha_venci} PZAS:${l.cantidad}`).join(' / ');
            desc += ` | ${lotesStr}`;
        }
        if (c.tasa_iva > 0) desc += ` | IVA ${Math.round(c.tasa_iva * 100)}%`;
        L.push(
            `C${i + 1}: ${c.cve_sat}@${c.sat_medida}@${c.desc_medida}@${c.cod_barras}` +
            `@${fmt4(c.cantidad)}@${desc}@${fmt2(c.precio_unitario)}@${fmt2(c.descuento)}@${fmt2(c.subtotal_linea)}`
        );
    });
    L.push('[/CONCEPTOS]', '');

    L.push('[TRASLADADOS_CONCEPTOS]');
    conceptos.forEach((c, i) => {
        const importeIva = +(c.subtotal_linea * c.tasa_iva).toFixed(2);
        L.push(
            `TC${i + 1}: C${i + 1}@${fmt2(c.subtotal_linea)}@${c.impuesto_sat}` +
            `@${c.tipo_factor}@${fmt2(c.tasa_iva)}@${fmt2(importeIva)}`
        );
    });
    L.push('[/TRASLADADOS_CONCEPTOS]', '');

    L.push('[IMPUESTOS_TRASLADADOS]');
    let itIdx = 1;
    for (const [tasa, datos] of mapaImpuestos.entries()) {
        L.push(
            `IT${itIdx++}: ${datos.ref.impuesto_sat}@${datos.ref.tipo_factor}@${fmt2(tasa)}` +
            `@${fmt2(datos.importeIva)}@${fmt2(datos.subtotalTasa)}`
        );
    }
    L.push('[/IMPUESTOS_TRASLADADOS]', '');

    const contenido = L.join('\r\n');
    const nombreArchivo = opts.nombreArchivo ?? `FactDig${series.ingreso}${folio}-Ingresos.txt`;
    const ruta = escribirTxt(nombreArchivo, L);
    return { ruta, contenido };
}

// ─────────────────────────────────────────────────────────────────────────────
// EGRESO (Nota de Crédito)
// ─────────────────────────────────────────────────────────────────────────────
export function generarTxtEgreso(opts: {
    emisor: EmisorTxt;
    receptor: ReceptorTxt;
    folio: number;
    uuid_relacionado: string;
    conceptos: ConceptoTxt[];
    leyenda: string;
    nombreArchivo?: string;
}): { ruta: string; contenido: string } {

    const { emisor, receptor, folio, uuid_relacionado, conceptos, leyenda } = opts;

    const subtotal = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
    const totalTraslados = conceptos.reduce((s, c) => s + +(c.subtotal_linea * c.tasa_iva).toFixed(2), 0);
    const totalNeto = +(subtotal + totalTraslados).toFixed(2);

    const mapaImpuestos = new Map<number, { subtotalTasa: number; importeIva: number; ref: ConceptoTxt }>();
    for (const c of conceptos) {
        const entry = mapaImpuestos.get(c.tasa_iva) ?? { subtotalTasa: 0, importeIva: 0, ref: c };
        entry.subtotalTasa += c.subtotal_linea;
        entry.importeIva += +(c.subtotal_linea * c.tasa_iva).toFixed(2);
        mapaImpuestos.set(c.tasa_iva, entry);
    }

    const L: string[] = [];
    L.push('[DATOS_EMISOR]');
    L.push(`NOMBRE1: ${emisor.nom_empre}`);
    L.push(`REGIMENFISCAL: ${emisor.regimen_fiscal_empre}`);
    L.push(`RFC1: ${emisor.rfc_empre}`);
    L.push('[/DATOS_EMISOR]', '');

    L.push('[DATOS_RECEPTOR]');
    L.push(`NOMBRE2: ${receptor.razon_social?.toUpperCase()}`);
    L.push(`RFC2: ${receptor.rfc}`);
    L.push(`DOMICILIOFISCAL: ${receptor.domicilio_fiscal}`);
    L.push(`REGIMENFISCAL2: ${receptor.regimen_fiscal ?? '616'}`);
    L.push(`USOCFDI: G02`);
    L.push('[/DATOS_RECEPTOR]', '');

    L.push('[DATOS_CFD]');
    const series = derivarSeries(emisor.serie_ingreso);
    L.push(`FOLIO: ${folio}`);
    L.push(`SERIE: ${series.egreso}`);
    L.push(`LUGAREXPEDICION: ${emisor.lugar_expedicion}`);
    L.push('TIPO_COMPROBANTE: E');
    L.push('TIPORELACION: 01');
    L.push(`RELACIONCFDI: ${uuid_relacionado.toUpperCase()}`);
    L.push('FORMAPAGO: 99');
    L.push('METODOPAGO: PUE');
    L.push('NUMCTAPAGO: ');
    L.push('DESCUENTO: 0.00');
    L.push('MOTIVODESCUENTO: _');
    L.push('MONEDA: MXN');
    L.push('TIPOCAMBIO: 1');
    L.push('TOTALRETENIDOS: 0.00');
    L.push(`TOTALTRASLADOS: ${fmt2(totalTraslados)}`);
    L.push(`SUBTOTAL: ${fmt2(subtotal)}`);
    L.push(`TOTALNETO: ${fmt2(totalNeto)}`);
    L.push(`LEYENDA: ${leyenda}`);
    L.push('OCULTAR_UUID: 1');
    L.push('[/DATOS_CFD]', '');

    // Un concepto por tasa de IVA (agrupado)
    const tasasOrdenadas = Array.from(mapaImpuestos.entries()).sort((a, b) => b[0] - a[0]); // mayor tasa primero
    L.push('[CONCEPTOS]');
    tasasOrdenadas.forEach(([tasa, datos], i) => {
        const tasaLabel = tasa > 0 ? `Con Tasa ${Math.round(tasa * 100)}%` : 'Tasa 0%';
        const sub = +datos.subtotalTasa.toFixed(2);
        L.push(
            `C${i + 1}: 84111506@ACT@ACTIVIDA@001@1.0000@Por Devolucion de Mercancia ${tasaLabel}@${fmt2(sub)}@0.00@${fmt2(sub)}`
        );
    });
    L.push('[/CONCEPTOS]', '');

    L.push('[TRASLADADOS_CONCEPTOS]');
    tasasOrdenadas.forEach(([tasa, datos], i) => {
        const sub = +datos.subtotalTasa.toFixed(2);
        const importeIva = +datos.importeIva.toFixed(2);
        L.push(
            `TC${i + 1}: C${i + 1}@${fmt2(sub)}@002@Tasa@${tasa === 0 ? '0.00' : fmt2(tasa)}@${fmt2(importeIva)}`
        );
    });
    L.push('[/TRASLADADOS_CONCEPTOS]', '');

    L.push('[IMPUESTOS_TRASLADADOS]');
    let itIdx = 1;
    for (const [tasa, datos] of mapaImpuestos.entries()) {
        L.push(
            `IT${itIdx++}: 002@Tasa@${tasa === 0 ? '0.00' : fmt2(tasa)}@${fmt2(datos.importeIva)}@${fmt2(datos.subtotalTasa)}`
        );
    }
    L.push('[/IMPUESTOS_TRASLADADOS]', '');

    const contenido = L.join('\r\n');
    const nombreArchivo = opts.nombreArchivo ?? `NotaDig${series.egreso}${folio}-Egresos.txt`;
    const ruta = escribirTxt(nombreArchivo, L);
    return { ruta, contenido };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGO (Complemento de Pago)
// ─────────────────────────────────────────────────────────────────────────────
export interface DocumentoPagoTxt {
    uuid_relacionado: string;
    folio_factura: string;
    serie_factura: string;
    monto_pago: number;
    saldo_anterior: number;
    saldo_insoluto: number;
    num_parcialidad: number;
    moneda: string;
    tasa_iva: number;   // 0 si exento
}

export function generarTxtPago(opts: {
    emisor: EmisorTxt;
    receptor: ReceptorTxt;
    folio: number;
    fecha_pago: string;   // YYYY-MM-DD
    id_forma_pago: string;
    num_operacion?: string;
    rfc_cta_ord?: string;
    rfc_cta_ben?: string;
    documentos: DocumentoPagoTxt[];
    moneda?: string;
    nombreArchivo?: string;
}): { ruta: string; contenido: string } {

    const { emisor, receptor, folio, fecha_pago, id_forma_pago, documentos } = opts;
    const moneda = opts.moneda ?? 'MXN';
    const num_operacion = opts.num_operacion ?? '';
    const rfc_cta_ord = opts.rfc_cta_ord ?? '.';
    const rfc_cta_ben = opts.rfc_cta_ben ?? '.';
    const montoTotal = documentos.reduce((s, d) => s + d.monto_pago, 0);

    // Agrupa bases IVA para INFO_PAGOS
    const baseIva16 = documentos.filter(d => d.tasa_iva >= 0.16).reduce((s, d) => s + d.monto_pago, 0);
    const baseIva0 = documentos.filter(d => d.tasa_iva < 0.16 && d.tasa_iva >= 0).reduce((s, d) => s + d.monto_pago, 0);

    const L: string[] = [];
    L.push('[DATOS_EMISOR]');
    L.push(`NOMBRE1: ${emisor.nom_empre}`);
    L.push(`REGIMENFISCAL: ${emisor.regimen_fiscal_empre}`);
    L.push(`RFC1: ${emisor.rfc_empre}`);
    L.push('[/DATOS_EMISOR]', '');

    L.push('[DATOS_RECEPTOR]');
    L.push(`NOMBRE2: ${receptor.razon_social?.toUpperCase()}`);
    L.push(`RFC2: ${receptor.rfc}`);
    L.push(`DOMICILIOFISCAL: ${receptor.domicilio_fiscal}`);
    L.push(`REGIMENFISCAL2: ${receptor.regimen_fiscal ?? '616'}`);
    L.push(`RESIDENCIAFISCAL: `);
    L.push(`USOCFDI: CP01`);
    L.push('[/DATOS_RECEPTOR]', '');

    L.push('[DATOS_CFD]');
    const series = derivarSeries(emisor.serie_ingreso);
    L.push(`FOLIO: ${folio}`);
    L.push(`SERIE: ${series.pago}`);
    L.push(`LUGAREXPEDICION: ${emisor.lugar_expedicion}`);
    L.push('TIPO_COMPROBANTE: P');
    L.push('FORMAPAGO: ');
    L.push('METODOPAGO: ');
    L.push('NUMCTAPAGO: ');
    L.push('DESCUENTO: 0.00');
    L.push('MOTIVODESCUENTO: _');
    L.push('MONEDA: XXX');
    L.push('TIPOCAMBIO: 1');
    L.push('TOTALRETENIDOS: 0.00');
    L.push('TOTALTRASLADOS: 0.00');
    L.push('SUBTOTAL: 0.00');
    L.push('TOTALNETO: 0.00');
    L.push('LEYENDA:');
    L.push('OCULTAR_UUID: 1');
    L.push('[/DATOS_CFD]', '');

    L.push('[CONCEPTOS]');
    L.push('C1: 84111506@ACT@.@.@1@Pago@0.00@0.00@0.00');
    L.push('[/CONCEPTOS]', '');

    L.push('[TRASLADADOS_CONCEPTOS]');
    L.push('[/TRASLADADOS_CONCEPTOS]', '');

    L.push('[RETENCIONES_CONCEPTOS]');
    L.push('[/RETENCIONES_CONCEPTOS]', '');

    L.push('[IMPUESTOS_TRASLADADOS]');
    L.push('[/IMPUESTOS_TRASLADADOS]', '');

    L.push('[IMPUESTOS_RETENIDOS]');
    L.push('[/IMPUESTOS_RETENIDOS]', '');

    L.push('[INFO_PAGOS]');
    L.push(`MontoTotalPagos: ${fmt2(montoTotal)}`);
    L.push('TotalRetencionesIVA: 0.00');
    L.push('TotalRetensionesISR: 0.00');
    L.push('TotalRetensionesIEPS: 0.00');
    L.push(`TotalTrasladosBaseIVA16: ${fmt2(baseIva16)}`);
    L.push(`TotalTrasladosImpuestoIVA16: 0.00`);
    L.push('TotalTrasladosBaseIVA8: 0.00');
    L.push('TotalTrasladosImpuestoIVA8: 0.00');
    L.push(`TotalTrasladosBaseIVA0: ${fmt2(baseIva0)}`);
    L.push('TotalTrasladosImpuestoIVA0: 0.00');
    L.push('TotalTrasladosBaseIVAExento: 0.00');
    L.push('[/INFO_PAGOS]', '');

    L.push('[PAGOS]');
    L.push(
        `P1: ${num_operacion}@${rfc_cta_ord}@.@${rfc_cta_ben}@${fmt2(montoTotal)}@${moneda}@1@${id_forma_pago}@${fecha_pago}@@@@@.@`
    );
    L.push('[/PAGOS]', '');

    L.push('[PAGOS_IMPUESTOS_RETENIDOS]');
    L.push('[/PAGOS_IMPUESTOS_RETENIDOS]', '');

    L.push('[PAGOS_IMPUESTOS_TRASLADOS]');
    documentos.forEach((_d, i) => {
        L.push(`PIT${i + 1}: P1@002@${fmt2(documentos[i].monto_pago)}@0.00@Tasa@0.000000`);
    });
    L.push('[/PAGOS_IMPUESTOS_TRASLADOS]', '');

    L.push('[DOCTOS_PAGOS]');
    documentos.forEach((d, i) => {
        L.push(
            `DP${i + 1}: P1@${d.folio_factura}@${d.serie_factura}@${fmt2(d.saldo_anterior)}` +
            `@${fmt2(d.monto_pago)}@${fmt2(d.saldo_insoluto)}@${d.num_parcialidad}@${d.moneda}@1@${d.uuid_relacionado.toUpperCase()}@02`
        );
    });
    L.push('[/DOCTOS_PAGOS]', '');

    L.push('[DOCTOS_PAGOS_RETENCIONES]');
    L.push('[/DOCTOS_PAGOS_RETENCIONES]', '');

    L.push('[DOCTOS_PAGOS_TRASLADOS]');
    documentos.forEach((d, i) => {
        L.push(`DPT${i + 1}: DP${i + 1}@002@${fmt2(d.monto_pago)}@0.00@Tasa@0.000000`);
    });
    L.push('[/DOCTOS_PAGOS_TRASLADOS]', '');

    const contenido = L.join('\r\n');
    const nombreArchivo = opts.nombreArchivo ?? `PagoDig${series.pago}${folio}-Pagos.txt`;
    const ruta = escribirTxt(nombreArchivo, L);
    return { ruta, contenido };
}
