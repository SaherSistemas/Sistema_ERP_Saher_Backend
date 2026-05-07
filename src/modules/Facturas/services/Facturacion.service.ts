import fs from 'fs';
import path from 'path';
import { Transaction } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { facturapiClient } from '../../../helpers/facturapi.helper';
import { ConceptoFacturacion, FacturacionRepository } from '../repositories/Facturacion.repository';
import { RemisionRepository } from '../../Finanzas/Remisiones/repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../../Finanzas/Remisiones/repositories/Detalle_Remision.repository';
import { CxCRepository } from '../../Finanzas/Cuentas_Por_Cobrar/repositories/CxC.repository';
import Facturas from '../model/Facturas.model';
import Detalle_Factura from '../model/Detalle_Factura.model';
import FacturaPagoCFDI from '../model/Factura_Pago_CFDI.model';

const RUTA_FACTURACION    = process.env.RUTA_FACTURACION ?? path.join(__dirname, '../../../../facturacion');
const RUTA_PDFS           = path.join(RUTA_FACTURACION, 'pdfs');
const RFC_PUBLICO_GENERAL = 'XAXX010101000';

// Descarga el PDF de FacturAPI y lo guarda localmente; devuelve la ruta absoluta.
async function descargarPdf(facturapiId: string): Promise<string> {
    if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
    const rutaPdf = path.join(RUTA_PDFS, `${facturapiId}.pdf`);
    const stream  = await (facturapiClient.invoices as any).downloadPdf(facturapiId);
    await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(rutaPdf);
        stream.pipe(file);
        file.on('finish', resolve);
        file.on('error', reject);
    });
    return rutaPdf;
}

// ─── Mapa de claves SAT de unidad de medida (informal → oficial) ─────────────
const SAT_UNIT_MAP: Record<string, string> = {
    PZA: 'H87', PZ:  'H87',                    // Pieza
    KG:  'KGM', KGS: 'KGM', KILO: 'KGM',       // Kilogramo
    LT:  'LTR', LTS: 'LTR', LITRO: 'LTR',      // Litro
    ML:  'MLT', MIL: 'MLT',                     // Mililitro
    MT:  'MTR', MTS: 'MTR', METRO: 'MTR',       // Metro
    M2:  'MTK', M3:  'MTQ',                     // Metro cuadrado / cúbico
    GR:  'GRM', GRS: 'GRM',                     // Gramo
    MG:  'MGM',                                 // Miligramo
    CAJ: 'XBX', CAJA: 'XBX',                    // Caja
    PAQ: 'XPK', PAQUETE: 'XPK',                 // Paquete
    JGO: 'SET',                                 // Juego / Set
    SRV: 'E48', SERV: 'E48', SERVICIO: 'E48',   // Servicio
    UNI: 'H87', UN: 'H87', UNIDAD: 'H87',       // Unidad (→ Pieza)
};

function normalizarClaveUnidad(clave: string | null | undefined): string | null {
    if (!clave) return null;
    const upper = clave.trim().toUpperCase();
    return SAT_UNIT_MAP[upper] ?? clave.trim();
}

// ─── helpers de formato ───────────────────────────────────────────────────────
function fmt4(n: number) { return n.toFixed(4); }
function fmt2(n: number) { return n.toFixed(2); }

function buildDescripcionConcepto(c: ConceptoFacturacion): string {
    let desc = c.descripcion;
    if (c.lotes?.length) {
        desc += ' - ' + c.lotes
            .map(l => `Lote:${l.lote} Fec/Cad: ${l.fecha_venci} Pzas: ${fmt4(l.cantidad).padStart(13, ' ')}`)
            .join(' ');
    }
    if (c.tasa_iva > 0) desc += ` ${(c.tasa_iva * 100).toFixed(2)}%`;
    return desc;
}

// ─── helpers de totales ───────────────────────────────────────────────────────
function calcularTotales(conceptos: ConceptoFacturacion[]) {
    const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
    const totalTraslados = conceptos.reduce((s, c) => s + +(c.subtotal_linea * c.tasa_iva).toFixed(2), 0);
    const totalNeto      = +(subtotal + totalTraslados).toFixed(2);
    return { subtotal: +fmt2(subtotal), iva: +fmt2(totalTraslados), total: totalNeto };
}

// ─── helper para crear CxC + Remision ────────────────────────────────────────
async function crearCxCyRemision(params: {
    factura_id: string;
    cab: { id_pedido_alm: string; id_cliente_alm: string; id_agente_alm: string };
    totales: { subtotal: number; iva: number; total: number };
    conceptos: ConceptoFacturacion[];
    dias_credito: number;
    esPublicoGeneral: boolean;
}, t: Transaction) {
    const { factura_id, cab, totales, conceptos, dias_credito, esPublicoGeneral } = params;

    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + dias_credito);

    let id_remision: string | null = null;

    if (esPublicoGeneral) {
        const folioRemision = await RemisionRepository.getUltimoFolio();
        const remision = await RemisionRepository.create({
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

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface IGenerarFacturaDTO {
    id_pedido_alm:    string;
    id_empresa:       string;
    id_cliente_real?: string;  // Cliente real cuando se factura como Público General
}

export interface IDetalleEgresoDTO {
    id_articulo: string;
    cantidad:    number;   // puede ser menor a la cantidad original (crédito parcial)
}

export interface ITimbrarEgresoDTO {
    id_factura_origen: string;
    detalles:          IDetalleEgresoDTO[];  // artículos y cantidades a acreditar
}

export interface ITimbrarPagoDTO {
    id_factura:      string;  // Factura tipo I a complementar
    fecha_pago:      string;  // ISO date
    id_forma_pago:   string;  // '01', '03', etc.
    monto_pago:      number;
    num_parcialidad: number;
    saldo_anterior:  number;
    moneda?:         string;  // default 'MXN'
    id_pago_cxc?:    string;  // opcional, para vincular con CxC
}

// ─── Servicio ─────────────────────────────────────────────────────────────────
export const FacturacionService = {

    // ── Legado: genera .txt para timbrado manual ──────────────────────────────
    generarTxt: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        const dias_credito       = Number(cab.plazo_pago_cliente ?? 0);
        const id_cliente_alm_real = cab.id_cliente_alm;
        const esPublicoGeneral   = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;

        const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
        const totalTraslados = conceptos.reduce((s, c) => s + c.subtotal_linea * c.tasa_iva, 0);
        const totalNeto      = subtotal + totalTraslados;

        const mapaImpuestos  = new Map<number, { subtotalTasa: number; importeIva: number }>();
        for (const c of conceptos) {
            const entry = mapaImpuestos.get(c.tasa_iva) ?? { subtotalTasa: 0, importeIva: 0 };
            entry.subtotalTasa += c.subtotal_linea;
            entry.importeIva   += +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            mapaImpuestos.set(c.tasa_iva, entry);
        }

        const folio   = cab.siguiente_folio;
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const lineas: string[] = [];

        lineas.push('[DATOS_EMISOR]');
        lineas.push(`NOMBRE1: ${cab.nom_empre}`);
        lineas.push(`REGIMENFISCAL: ${cab.regimen_fiscal_empre}`);
        lineas.push(`RFC1: ${cab.rfc_empre}`);
        lineas.push('[/DATOS_EMISOR]', '');

        lineas.push('[DATOS_RECEPTOR]');
        lineas.push(`NOMBRE2: ${cab.razon_social_cliente}`);
        lineas.push(`RFC2: ${cab.rfc_cliente}`);
        lineas.push(`DOMICILIOFISCAL: ${cab.domicilio_fiscal}`);
        lineas.push(`REGIMENFISCAL2: ${cab.regimen_fiscal_cliente}`);
        lineas.push(`USOCFDI: ${cab.uso_cfdi}`);
        lineas.push('[/DATOS_RECEPTOR]', '');

        lineas.push('[DATOS_CFD]');
        lineas.push(`FOLIO: ${folio}`);
        lineas.push(`SERIE: ${cab.serie_facturacion_empre}`);
        lineas.push(`LUGAREXPEDICION: ${cab.lugar_expedicion}`);
        lineas.push('TIPO_COMPROBANTE: I');
        lineas.push(`FORMAPAGO: ${cab.forma_pago}`);
        lineas.push(`METODOPAGO: ${cab.metodo_pago}`);
        lineas.push('NUMCTAPAGO: ');
        lineas.push('DESCUENTO: 0.00');
        lineas.push('MOTIVODESCUENTO: _');
        lineas.push('MONEDA: MXN');
        lineas.push('TIPOCAMBIO: 1');
        lineas.push('TOTALRETENIDOS: 0.00');
        lineas.push(`TOTALTRASLADOS: ${fmt2(totalTraslados)}`);
        lineas.push(`SUBTOTAL: ${fmt2(subtotal)}`);
        lineas.push(`TOTALNETO: ${fmt2(totalNeto)}`);
        lineas.push(`LEYENDA: ${leyenda}`);
        lineas.push('OCULTAR_UUID: 1');
        lineas.push('VALIDEZ_OBLIGACIONES: 2');
        lineas.push('[/DATOS_CFD]', '');

        lineas.push('[CONCEPTOS]');
        lineas.push('C#: cve sat@unimed@des medi@c barras@Piezas@Descripcion de Articulo + lotes y caducidad como sus pzas@precio unt@descto@subtotal');
        conceptos.forEach((c, i) => {
            lineas.push(
                `C${i + 1}: ${c.cve_sat}@${c.sat_medida}@${c.desc_medida}@${c.cod_barras}` +
                `@${fmt4(c.cantidad)}@${buildDescripcionConcepto(c)}@${fmt2(c.precio_unitario)}@${fmt2(c.descuento)}@${fmt2(c.subtotal_linea)}`
            );
        });
        lineas.push('[/CONCEPTOS]', '');

        lineas.push('[TRASLADADOS_CONCEPTOS]');
        lineas.push('TC#: C#@subtotal linea@CveTasa@Dest Tasa@% iva@imp IVA');
        conceptos.forEach((c, i) => {
            const importeIva = +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            lineas.push(
                `TC${i + 1}: C${i + 1}@${fmt2(c.subtotal_linea)}@${c.impuesto_sat}` +
                `@${c.tipo_factor}@${fmt2(c.tasa_iva)}@${fmt2(importeIva)}`
            );
        });
        lineas.push('[/TRASLADADOS_CONCEPTOS]', '');

        lineas.push('[IMPUESTOS_TRASLADADOS]');
        lineas.push('IT#: Cve Tasa@% iva@Imp IVA@Subtotal tasa');
        let itIdx = 1;
        for (const [tasa, datos] of mapaImpuestos.entries()) {
            const ref = conceptos.find(c => c.tasa_iva === tasa)!;
            lineas.push(
                `IT${itIdx++}: ${ref.impuesto_sat}@${ref.tipo_factor}@${fmt2(tasa)}` +
                `@${fmt2(datos.importeIva)}@${fmt2(datos.subtotalTasa)}`
            );
        }
        lineas.push('[/IMPUESTOS_TRASLADADOS]');

        if (!fs.existsSync(RUTA_FACTURACION)) fs.mkdirSync(RUTA_FACTURACION, { recursive: true });
        const nombreArchivo = `${cab.serie_facturacion_empre}${folio}_${cab.cod_int_pedido_alm}.txt`;
        const rutaArchivo   = path.join(RUTA_FACTURACION, nombreArchivo);
        fs.writeFileSync(rutaArchivo, lineas.join('\r\n'), 'latin1');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            const totales = calcularTotales(conceptos);

            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi:      'I',
                origen_factura: 'PED',
                id_pedido_alm:  cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_metodo_pago: cab.metodo_pago,
                id_forma_pago:  cab.forma_pago,
                uso_cfdi:       cab.uso_cfdi,
                subtotal:       totales.subtotal,
                iva:            totales.iva,
                total:          totales.total,
                conceptos:      conceptos.map(c => ({
                    id_articulo:    c.id_articulo,
                    descripcion:    c.descripcion,
                    cantidad:       c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva:       c.tasa_iva,
                })),
            }, t);

            const id_remision = await crearCxCyRemision({
                factura_id:       factura.id_factura,
                cab,
                totales,
                conceptos,
                dias_credito,
                esPublicoGeneral,
            }, t);

            await t.commit();

            return {
                ruta:             rutaArchivo,
                folio,
                id_factura:       factura.id_factura,
                flujo:            esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
                credito_generado: true,
                id_remision,
            };

        } catch (error) {
            await t.rollback();
            if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
            throw error;
        }
    },

    // ── Timbrar Ingreso directamente con Facturapi ────────────────────────────
    timbrarIngreso: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_cliente_real } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        const dias_credito   = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
        const totales        = calcularTotales(conceptos);
        const folio          = cab.siguiente_folio;
        const leyenda        = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        // 1. Guardar en BD como PEN + CxC + Remision
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        let id_remision: string | null = null;

        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi:      'I',
                origen_factura: 'PED',
                id_pedido_alm:  cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_metodo_pago: cab.metodo_pago,
                id_forma_pago:  cab.forma_pago,
                uso_cfdi:       cab.uso_cfdi,
                subtotal:       totales.subtotal,
                iva:            totales.iva,
                total:          totales.total,
                conceptos:      conceptos.map(c => ({
                    id_articulo:    c.id_articulo,
                    descripcion:    c.descripcion,
                    cantidad:       c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva:       c.tasa_iva,
                })),
            }, t);

            id_factura = factura.id_factura;

            id_remision = await crearCxCyRemision({
                factura_id: factura.id_factura,
                cab: {
                    ...cab,
                    // Si el usuario eligió un cliente real para la remisión, lo usamos
                    id_cliente_alm: id_cliente_real ?? cab.id_cliente_alm,
                },
                totales,
                conceptos,
                dias_credito,
                esPublicoGeneral,
            }, t);

            await t.commit();

        } catch (err) {
            await t.rollback();
            throw err;
        }

        // 2. Timbrar con Facturapi (fuera de transacción — si falla queda PEN y se puede reintentar)
        try {
            const respuesta = await (facturapiClient.invoices as any).create({
                type:           'I',
                customer: {
                    legal_name: esPublicoGeneral ? 'PUBLICO EN GENERAL' : cab.razon_social_cliente,
                    tax_id:     cab.rfc_cliente,
                    tax_system: esPublicoGeneral ? '616' : cab.regimen_fiscal_cliente,
                    address:    { zip: cab.domicilio_fiscal },
                },
                items: conceptos.map(c => ({
                    quantity: c.cantidad,
                    product: {
                        description:  buildDescripcionConcepto(c),
                        product_key:  c.cve_sat,
                        price:        +Number(c.precio_unitario).toFixed(2),
                        tax_included: false,
                        unit_key:     normalizarClaveUnidad(c.sat_medida),
                        unit_name:    c.desc_medida,
                        taxes: c.tasa_iva > 0
                            ? [{ type: 'IVA', rate: c.tasa_iva, factor: 'Tasa' }]
                            : [],
                    },
                })),
                payment_form:   cab.forma_pago   || null,
                payment_method: cab.metodo_pago  || null,
                use:            cab.uso_cfdi     || null,
                series:         cab.serie_facturacion_empre,
                folio_number:   folio,
                conditions:     leyenda,
                currency:       'MXN',
            });

            const pdf_local = await descargarPdf(respuesta.id);

            await FacturacionRepository.actualizarTimbrado(id_factura!, {
                uuid_sat:       respuesta.uuid,
                fecha_timbrado: new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:        pdf_local,
                xml_url:        respuesta.xml_url,
            });

            return {
                id_factura:  id_factura!,
                folio,
                uuid_sat:    respuesta.uuid,
                pdf_url:     pdf_local,
                xml_url:     respuesta.xml_url,
                flujo:       esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
                id_remision,
            };

        } catch (err: any) {
            // El registro en BD quedó como PEN — puede reintentarse con /timbrar-pendiente
            throw new Error(`Registro guardado (PEN) pero falló el timbrado en Facturapi: ${err.message}`);
        }
    },

    // ── Timbrar Egreso (Nota de Crédito) ─────────────────────────────────────
    timbrarEgreso: async (dto: ITimbrarEgresoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura_origen);
        if (!origen) throw new Error('Factura origen no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede crear nota de crédito de facturas tipo Ingreso');
        if (!origen.uuid_sat) throw new Error('La factura origen no está timbrada (sin UUID SAT)');
        if (!dto.detalles?.length) throw new Error('Debes especificar al menos un artículo a acreditar');

        // Construir los detalles del egreso a partir de los datos de la factura origen
        const detallesEgreso = dto.detalles.map(d => {
            const original = origen.detalles.find(o => o.id_articulo === d.id_articulo);
            if (!original) throw new Error(`Artículo ${d.id_articulo} no existe en la factura origen`);
            if (d.cantidad > original.cantidad_facturada) {
                throw new Error(`La cantidad a acreditar (${d.cantidad}) excede la facturada (${original.cantidad_facturada}) para el artículo ${d.id_articulo}`);
            }
            const subtotal_linea = +(d.cantidad * original.precio_artic).toFixed(2);
            return {
                id_articulo:    original.id_articulo,
                descripcion:    original.descripcion_articulo,
                cantidad:       d.cantidad,
                precio_unitario: original.precio_artic,
                subtotal_linea,
                tasa_iva:       original.tasa_iva,
                // datos SAT para la llamada a Facturapi
                cve_sat:        original.cve_sat,
                sat_medida:     original.sat_medida,
                desc_medida:    original.desc_medida,
            };
        });

        // Recalcular totales con los detalles reales del egreso
        const subtotal = detallesEgreso.reduce((s, d) => s + d.subtotal_linea, 0);
        const iva      = detallesEgreso.reduce((s, d) => s + +(d.subtotal_linea * d.tasa_iva).toFixed(2), 0);
        const total    = +(subtotal + iva).toFixed(2);

        const folio = await FacturacionRepository.getSiguienteFolio();

        // 1. Registrar Egreso en BD como PEN
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;

        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi:         'E',
                origen_factura:    'CXC',
                id_cliente_alm:    origen.id_cliente_alm,
                id_forma_pago:     origen.id_forma_pago,
                uso_cfdi:          'G02',
                subtotal:          +subtotal.toFixed(2),
                iva:               +iva.toFixed(2),
                total,
                id_factura_origen: dto.id_factura_origen,
                uuid_relacionado:  origen.uuid_sat,
                conceptos:         detallesEgreso,
            }, t);

            id_factura = factura.id_factura;
            await t.commit();

        } catch (err) {
            await t.rollback();
            throw err;
        }

        // 2. Timbrar con Facturapi
        try {
            const respuesta = await (facturapiClient.invoices as any).create({
                type:     'E',
                customer: {
                    legal_name: origen.razon_social_cliente,
                    tax_id:     origen.rfc_cliente,
                    tax_system: origen.regimen_fiscal_cliente,
                    address:    { zip: origen.domicilio_fiscal },
                },
                items: detallesEgreso.map(d => ({
                    quantity: d.cantidad,
                    product: {
                        description:  d.descripcion,
                        product_key:  d.cve_sat,
                        price:        +Number(d.precio_unitario).toFixed(2),
                        tax_included: false,
                        unit_key:     normalizarClaveUnidad(d.sat_medida),
                        unit_name:    d.desc_medida,
                        taxes: d.tasa_iva > 0
                            ? [{ type: 'IVA', rate: Number(d.tasa_iva), factor: 'Tasa' }]
                            : [],
                    },
                })),
                payment_form:      origen.id_forma_pago,
                use:               'G02',
                related_documents: [{
                    relationship: '01',   // Nota de crédito de los documentos relacionados
                    uuid:         origen.uuid_sat,
                }],
                currency: 'MXN',
            });

            await FacturacionRepository.actualizarTimbrado(id_factura!, {
                uuid_sat:       respuesta.uuid,
                fecha_timbrado: new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:        respuesta.pdf_url,
                xml_url:        respuesta.xml_url,
            });

            return {
                id_factura:        id_factura!,
                id_factura_origen: dto.id_factura_origen,
                folio,
                subtotal:          +subtotal.toFixed(2),
                iva:               +iva.toFixed(2),
                total,
                uuid_sat:          respuesta.uuid,
                pdf_url:           respuesta.pdf_url,
                xml_url:           respuesta.xml_url,
            };

        } catch (err: any) {
            throw new Error(`Registro Egreso guardado (PEN) pero falló el timbrado en Facturapi: ${err.message}`);
        }
    },

    // ── Reintentar timbrado de una factura PEN (I, E o P) ────────────────────
    reintentarTimbrado: async (id_factura: string, id_empresa: string) => {

        const factura = await Facturas.findByPk(id_factura);
        if (!factura)                            throw new Error('Factura no encontrada');
        if (factura.estatus_factura === 'TIM')   throw new Error('La factura ya está timbrada');
        if (factura.estatus_factura === 'CAN')   throw new Error('La factura está cancelada, no se puede reintentar');

        // ── Tipo I: Ingreso ──────────────────────────────────────────────────
        if (factura.tipo_cfdi === 'I') {
            if (!factura.id_pedido_alm) throw new Error('La factura no tiene pedido asociado');

            const [cab, conceptos] = await Promise.all([
                FacturacionRepository.getCabecera(factura.id_pedido_alm, id_empresa),
                FacturacionRepository.getConceptos(factura.id_pedido_alm),
            ]);
            if (!conceptos.length) throw new Error('El pedido no tiene conceptos');

            const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
            const folio            = Number(factura.folio_factura);
            const leyenda          = cab.leyenda_factura_empre
                ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'I',
                customer: {
                    legal_name: esPublicoGeneral ? 'PUBLICO EN GENERAL' : cab.razon_social_cliente,
                    tax_id:     cab.rfc_cliente,
                    tax_system: esPublicoGeneral ? '616' : cab.regimen_fiscal_cliente,
                    address:    { zip: cab.domicilio_fiscal },
                },
                items: conceptos.map(c => ({
                    quantity: c.cantidad,
                    product: {
                        description:  buildDescripcionConcepto(c),
                        product_key:  c.cve_sat,
                        price:        +Number(c.precio_unitario).toFixed(2),
                        tax_included: false,
                        unit_key:     normalizarClaveUnidad(c.sat_medida),
                        unit_name:    c.desc_medida,
                        taxes: c.tasa_iva > 0
                            ? [{ type: 'IVA', rate: c.tasa_iva, factor: 'Tasa' }]
                            : [],
                    },
                })),
                payment_form:   cab.forma_pago   || null,
                payment_method: cab.metodo_pago  || null,
                use:            cab.uso_cfdi     || null,
                series:         cab.serie_facturacion_empre,
                folio_number:   folio,
                conditions:     leyenda,
                currency:       'MXN',
            });

            const pdf_local = await descargarPdf(respuesta.id);

            await FacturacionRepository.actualizarTimbrado(id_factura, {
                uuid_sat:       respuesta.uuid,
                fecha_timbrado: new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:        pdf_local,
                xml_url:        respuesta.xml_url,
            });

            return {
                id_factura,
                folio,
                uuid_sat: respuesta.uuid,
                pdf_url:  pdf_local,
                xml_url:  respuesta.xml_url,
                flujo:    esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
            };
        }

        // ── Tipo E: Egreso (Nota de Crédito) ─────────────────────────────────
        if (factura.tipo_cfdi === 'E') {
            const datos = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
            if (!datos)               throw new Error('No se encontraron los datos de la factura E');
            if (!factura.uuid_relacionado) throw new Error('La factura origen no tiene UUID SAT registrado');

            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'E',
                customer: {
                    legal_name: datos.razon_social_cliente,
                    tax_id:     datos.rfc_cliente,
                    tax_system: datos.regimen_fiscal_cliente,
                    address:    { zip: datos.domicilio_fiscal },
                },
                items: datos.detalles.map(d => ({
                    quantity: d.cantidad_facturada,
                    product: {
                        description:  d.descripcion_articulo,
                        product_key:  d.cve_sat,
                        price:        +Number(d.precio_artic).toFixed(2),
                        tax_included: false,
                        unit_key:     normalizarClaveUnidad(d.sat_medida),
                        unit_name:    d.desc_medida,
                        taxes: d.tasa_iva > 0
                            ? [{ type: 'IVA', rate: Number(d.tasa_iva), factor: 'Tasa' }]
                            : [],
                    },
                })),
                payment_form:      datos.id_forma_pago,
                use:               'G02',
                related_documents: [{
                    relationship: '01',
                    uuid:         factura.uuid_relacionado,
                }],
                currency: 'MXN',
            });

            await FacturacionRepository.actualizarTimbrado(id_factura, {
                uuid_sat:       respuesta.uuid,
                fecha_timbrado: new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:        respuesta.pdf_url,
                xml_url:        respuesta.xml_url,
            });

            return {
                id_factura,
                folio:    Number(factura.folio_factura),
                uuid_sat: respuesta.uuid,
                pdf_url:  respuesta.pdf_url,
                xml_url:  respuesta.xml_url,
            };
        }

        // ── Tipo P: Complemento de Pago ───────────────────────────────────────
        if (factura.tipo_cfdi === 'P') {
            if (!factura.id_factura_origen) throw new Error('La factura P no tiene factura origen');

            const pagoCFDI = await FacturaPagoCFDI.findOne({
                where: { id_factura: factura.id_factura_origen },
                order: [['createdAt', 'DESC']],
            });
            if (!pagoCFDI) throw new Error('No se encontró el registro FacturaPagoCFDI para esta factura P');

            const origen = await FacturacionRepository.getFacturaParaTimbrar(factura.id_factura_origen);
            if (!origen)              throw new Error('Factura origen no encontrada');
            if (!origen.uuid_sat)     throw new Error('La factura origen no está timbrada');

            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'P',
                customer: {
                    legal_name: origen.razon_social_cliente,
                    tax_id:     origen.rfc_cliente,
                    tax_system: origen.regimen_fiscal_cliente,
                    address:    { zip: origen.domicilio_fiscal },
                },
                payments: [{
                    date:          pagoCFDI.fecha_pago,
                    form:          pagoCFDI.forma_de_pago,
                    amount:        Number(pagoCFDI.monto_pagado),
                    currency:      pagoCFDI.moneda,
                    exchange_rate: 1,
                    related_documents: [{
                        uuid:               origen.uuid_sat,
                        amount:             Number(pagoCFDI.monto_pagado),
                        installment_number: pagoCFDI.num_parcialidad,
                        last_balance:       Number(pagoCFDI.saldo_anterior),
                        currency:           pagoCFDI.moneda,
                        exchange_rate:      1,
                    }],
                }],
            });

            await FacturaPagoCFDI.update({
                uuid_cfdi_pago:   respuesta.uuid,
                pdf_url:          respuesta.pdf_url,
                xml_url:          respuesta.xml_url,
                estatus_timbrado: 'TIM',
            }, { where: { id_pago_cfdi: pagoCFDI.id_pago_cfdi } });

            await Facturas.update({
                uuid_sat:        respuesta.uuid,
                fecha_timbrado:  new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:         respuesta.pdf_url,
                xml_url:         respuesta.xml_url,
                estatus_factura: 'TIM',
                estatus_sat:     'vigente',
            }, { where: { id_factura } });

            return {
                id_factura,
                folio:    Number(factura.folio_factura),
                uuid_sat: respuesta.uuid,
                pdf_url:  respuesta.pdf_url,
                xml_url:  respuesta.xml_url,
            };
        }

        throw new Error(`Tipo de CFDI '${factura.tipo_cfdi}' no soportado para reintento`);
    },

    // ── Timbrar Pago (Complemento de Pago) ───────────────────────────────────
    timbrarPago: async (dto: ITimbrarPagoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura);
        if (!origen) throw new Error('Factura no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede generar complemento de pago de facturas tipo Ingreso');
        if (!origen.uuid_sat) throw new Error('La factura no está timbrada (sin UUID SAT)');

        const moneda       = dto.moneda ?? 'MXN';
        const saldo_insoluto = +(dto.saldo_anterior - dto.monto_pago).toFixed(2);
        const folio        = await FacturacionRepository.getSiguienteFolio();

        // 1. Crear Factura tipo P + FacturaPagoCFDI en BD
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura_pago: string;
        let id_pago_cfdi: string;

        try {
            const facturaPago = await Facturas.create({
                folio_factura:     String(folio),
                tipo_cfdi:         'P',
                origen_factura:    'CXC',
                fecha_emision:     new Date(),
                subtotal_factura:  0,
                iva_factura:       0,
                total_factura:     dto.monto_pago,
                estatus_factura:   'PEN',
                id_cliente_alm:    origen.id_cliente_alm,
                id_factura_origen: dto.id_factura,
                uuid_relacionado:  origen.uuid_sat,
            }, { transaction: t });

            id_factura_pago = facturaPago.id_factura;

            const pagoCFDI = await FacturaPagoCFDI.create({
                id_factura:      dto.id_factura,
                id_pago_cxc:     dto.id_pago_cxc ?? null,
                fecha_pago:      new Date(dto.fecha_pago),
                forma_de_pago:   dto.id_forma_pago,
                moneda,
                monto_pagado:    dto.monto_pago,
                num_parcialidad: dto.num_parcialidad,
                saldo_anterior:  dto.saldo_anterior,
                saldo_insoluto,
                uuid_relacionado: origen.uuid_sat,
                estatus_timbrado: 'PEN',
            }, { transaction: t });

            id_pago_cfdi = pagoCFDI.id_pago_cfdi;
            await t.commit();

        } catch (err) {
            await t.rollback();
            throw err;
        }

        // 2. Timbrar con Facturapi
        try {
            const respuesta = await (facturapiClient.invoices as any).create({
                type:     'P',
                customer: {
                    legal_name: origen.razon_social_cliente,
                    tax_id:     origen.rfc_cliente,
                    tax_system: origen.regimen_fiscal_cliente,
                    address:    { zip: origen.domicilio_fiscal },
                },
                payments: [{
                    date:          new Date(dto.fecha_pago),
                    form:          dto.id_forma_pago,
                    amount:        dto.monto_pago,
                    currency:      moneda,
                    exchange_rate: 1,
                    related_documents: [{
                        uuid:               origen.uuid_sat,
                        amount:             dto.monto_pago,
                        installment_number: dto.num_parcialidad,
                        last_balance:       dto.saldo_anterior,
                        currency:           moneda,
                        exchange_rate:      1,
                    }],
                }],
            });

            // Actualizar FacturaPagoCFDI
            await FacturaPagoCFDI.update({
                uuid_cfdi_pago:   respuesta.uuid,
                pdf_url:          respuesta.pdf_url,
                xml_url:          respuesta.xml_url,
                estatus_timbrado: 'TIM',
            }, { where: { id_pago_cfdi: id_pago_cfdi! } });

            // Actualizar Factura tipo P
            await Facturas.update({
                uuid_sat:        respuesta.uuid,
                fecha_timbrado:  new Date(respuesta.stamp?.date ?? Date.now()),
                pdf_url:         respuesta.pdf_url,
                xml_url:         respuesta.xml_url,
                estatus_factura: 'TIM',
                estatus_sat:     'vigente',
            }, { where: { id_factura: id_factura_pago! } });

            return {
                id_factura_pago: id_factura_pago!,
                id_pago_cfdi:    id_pago_cfdi!,
                folio,
                uuid_sat:        respuesta.uuid,
                pdf_url:         respuesta.pdf_url,
                xml_url:         respuesta.xml_url,
            };

        } catch (err: any) {
            await FacturaPagoCFDI.update(
                { estatus_timbrado: 'ERR' },
                { where: { id_pago_cfdi: id_pago_cfdi! } }
            );
            throw new Error(`Registro Pago guardado (PEN/ERR) pero falló el timbrado en Facturapi: ${err.message}`);
        }
    },
};
