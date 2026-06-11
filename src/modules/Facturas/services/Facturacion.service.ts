import fs from 'fs';
import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal, dbPoly } from '../../../config/db';
import { facturapiClient } from '../../../helpers/facturapi.helper';
import { FacturacionRepository } from '../repositories/Facturacion.repository';
import { ConceptoFacturacion } from '../interfaces/Facturacion.types';
import {
    IGenerarFacturaDTO,
    IDetalleEgresoDTO,
    ITimbrarEgresoDTO,
    ITimbrarPagoDTO,
} from '../interfaces/Facturacion.dto';
import { descargarPdf, RUTA_FACTURACION, RUTA_PDFS } from '../helpers/pdf.helper';
import { generarTrasladoPDFBuffer } from '../helpers/traslado.pdf';
import { generarTraspasoCompletoPDFBuffer, TraspasoItem } from '../helpers/traspaso.pdf';
import { normalizarClaveUnidad, fmt2, fmt4 } from '../helpers/sat.helper';
import {
    RFC_PUBLICO_GENERAL,
    buildDescripcionConcepto,
    calcularTotales,
    particionarConceptos,
    crearCxCyRemision,
} from '../helpers/factura.helper';
import Facturas from '../model/Facturas.model';
import Trabajo_Impresion from '../../Impresiones/model/Trabajo_Impresion';
import Impresora from '../../Impresiones/model/Impresora';
import FacturaPagoCFDI from '../model/Factura_Pago_CFDI.model';
import { Stock_Ubicacion_LoteRepository } from '../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import { Kardex_Movimiento_ArticuloRepository } from '../../Almacen/Kardex/repositories/Kardex_Movimiento_Articulo.repository';

export { IGenerarFacturaDTO, IDetalleEgresoDTO, ITimbrarEgresoDTO, ITimbrarPagoDTO };

export const FacturacionService = {

    // ── Legado: genera .txt para timbrado manual ──────────────────────────────
    generarTxt: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_empleado } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        const dias_credito       = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral   = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;

        const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
        const totalTraslados = conceptos.reduce((s, c) => s + c.subtotal_linea * c.tasa_iva, 0);
        const totalNeto      = subtotal + totalTraslados;

        const mapaImpuestos = new Map<number, { subtotalTasa: number; importeIva: number }>();
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
        const rutaArchivo   = require('path').join(RUTA_FACTURACION, nombreArchivo);
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
                    id_articulo:     c.id_articulo,
                    descripcion:     c.descripcion,
                    cantidad:        c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea:  c.subtotal_linea,
                    tasa_iva:        c.tasa_iva,
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

            // ── Descontar stock, registrar kardex y marcar pedido como facturado ──
            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura:   factura.id_factura,
                cod_pedido:   cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

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

        const { id_pedido_alm, id_empresa, id_cliente_real, id_empleado } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        // ── Bifurcación:
        //   id_empresa_sys_anterior != null  Y  tipo_comprobante = 'TRA' → CFDI tipo T (traslado sin timbrar)
        //   id_empresa_sys_anterior != null  Y  tipo_comprobante = 'FAC' → CFDI tipo I timbrado + insert POS viejo
        //   id_empresa_sys_anterior = null                                → CFDI tipo I normal
        if (cab.id_empresa_sys_anterior != null && cab.tipo_comprobante === 'TRA') {
            return FacturacionService._timbrarTraslado({ cab, conceptos, id_empresa, id_empleado });
        }

        const dias_credito     = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
        const limite           = Number(cab.limite_por_factura ?? 0);
        const leyenda          = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const particiones = particionarConceptos(conceptos, limite);
        const basefolio   = await FacturacionRepository.getSiguienteFolio();

        // ── 1. Registrar todas las facturas + CxC en una sola transacción ──────
        type RegistroIntermedio = {
            id_factura:      string;
            folio:           number;
            totales:         ReturnType<typeof calcularTotales>;
            id_remision:     string | null;
            conceptosParte:  ConceptoFacturacion[];
        };

        const registros: RegistroIntermedio[] = [];
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            for (let i = 0; i < particiones.length; i++) {
                const conceptosParte = particiones[i];
                const totales        = calcularTotales(conceptosParte);
                const folio          = basefolio + i;

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
                    conceptos:      conceptosParte.map(c => ({
                        id_articulo:     c.id_articulo,
                        descripcion:     c.descripcion,
                        cantidad:        c.cantidad,
                        precio_unitario: c.precio_unitario,
                        subtotal_linea:  c.subtotal_linea,
                        tasa_iva:        c.tasa_iva,
                    })),
                }, t);

                const id_remision = await crearCxCyRemision({
                    factura_id: factura.id_factura,
                    cab:        { ...cab, id_cliente_alm: id_cliente_real ?? cab.id_cliente_alm },
                    totales,
                    conceptos:  conceptosParte,
                    dias_credito,
                    esPublicoGeneral,
                }, t);

                registros.push({ id_factura: factura.id_factura, folio, totales, id_remision, conceptosParte });
            }

            // ── Descontar stock, registrar kardex y marcar pedido como facturado ──
            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura:   registros[0].id_factura,
                cod_pedido:   cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();

        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── 2. Timbrar cada factura con Facturapi (fuera de transacción) ────────
        const facturas = await Promise.all(
            registros.map(async ({ id_factura, folio, id_remision, conceptosParte }) => {
                try {
                    const respuesta = await (facturapiClient.invoices as any).create({
                        type:    'I',
                        customer: {
                            legal_name: esPublicoGeneral ? 'PUBLICO EN GENERAL' : cab.razon_social_cliente,
                            tax_id:     cab.rfc_cliente,
                            tax_system: esPublicoGeneral ? '616' : cab.regimen_fiscal_cliente,
                            address:    { zip: cab.domicilio_fiscal },
                        },
                        items: conceptosParte.map(c => ({
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

                    return { id_factura, folio, uuid_sat: respuesta.uuid, pdf_url: pdf_local, xml_url: respuesta.xml_url, id_remision };

                } catch (err: any) {
                    return { id_factura, folio, id_remision, error: `Registro guardado (PEN) pero falló el timbrado: ${err.message}` };
                }
            })
        );

        // ── 3. Si es empresa propia con factura normal → insertar en POS viejo ──
        if (cab.id_empresa_sys_anterior != null) {
            // Usamos el folio de la primera factura generada como pedcdpedn
            const primerFolio = registros[0].folio;
            try {
                await FacturacionService._insertarEnPOSAntiguo({
                    prefijo:               'FAC',
                    id_empresa_sys_anterior: cab.id_empresa_sys_anterior,
                    folio:                 primerFolio,
                    plazo_pago:            cab.plazo_pago_cliente,
                    total:                 registros[0].totales.total,
                    conceptos,
                });
            } catch (errPoly) {
                console.error('[FACTURA_EMPRESA] Error al insertar en BD vieja:', errPoly);
                // No lanzar — la factura ya está timbrada
            }
        }

        return {
            flujo:          esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
            total_facturas: facturas.length,
            facturas,
        };
    },

    // ── Helper compartido: insert en rme0010/rme00101/rme00102 (POS viejo) ────
    _insertarEnPOSAntiguo: async ({
        prefijo, id_empresa_sys_anterior, folio, plazo_pago, total, conceptos,
    }: {
        prefijo:               'TRA' | 'FAC';
        id_empresa_sys_anterior: number;
        folio:                 number;
        plazo_pago:            number;
        total:                 number;
        conceptos:             ConceptoFacturacion[];
    }) => {
        const parseFechaVenci = (f: string): string => {
            const [mes, anio] = f.split('/');
            const m   = parseInt(mes,  10);
            const a   = parseInt(anio, 10);
            const dia = new Date(a, m, 0).getDate();
            return `${a}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        };

        const rmenufacc = `${prefijo}-${id_empresa_sys_anterior}-${folio}`;
        const fechaHoy  = new Date().toISOString().split('T')[0];

        const tPoly = await dbPoly.transaction();
        try {
            await dbPoly.query(`
                INSERT INTO rme0010 (empcdempn, rmenufacc, prvcdprvn, rmeplazon, rmefecfad, rmefecred, rmefecpad, rmefecemd, rmedscesn, pedcdpedn, rmestatuc, rmenetopn, rmeivafan, rmerupdfc, rmeruxmlc)
                VALUES (:empcdempn, :rmenufacc, 15, :rmeplazon, :rmefecfad, :rmefecfad, :rmefecfad, :rmefecfad, 0, :pedcdpedn, 'C', :rmenetopn, 16, '', '')
            `, {
                replacements: { empcdempn: id_empresa_sys_anterior, rmenufacc, rmeplazon: plazo_pago, rmefecfad: fechaHoy, pedcdpedn: folio, rmenetopn: total },
                type: QueryTypes.INSERT,
                transaction: tPoly,
            });

            for (const c of conceptos) {
                await dbPoly.query(`
                    INSERT INTO rme00101 (empcdempn, rmenufacc, prvcdprvn, artcdartn, rmecanfan, rmecanren, rmecanmen, rmepreunn, rmedescon, rmedesofn, rmepreofn, rmeprentn, rmeimplnn, rmeporivn, rmeimivln, rmeafemoc, rmedesesn)
                    VALUES (:empcdempn, :rmenufacc, 15, :artcdartn, :cantidad, :cantidad, 0, :precio, 0, 0, :precio, :precio, :subtotal, :poriva, :imiva, 'N', 0)
                `, {
                    replacements: {
                        empcdempn: id_empresa_sys_anterior, rmenufacc,
                        artcdartn: c.cod_int_artic, cantidad: c.cantidad,
                        precio:    c.precio_unitario, subtotal: c.subtotal_linea,
                        poriva:    c.tasa_iva * 100,
                        imiva:     +(c.subtotal_linea * c.tasa_iva).toFixed(2),
                    },
                    type: QueryTypes.INSERT,
                    transaction: tPoly,
                });

                for (const lote of c.lotes) {
                    await dbPoly.query(`
                        INSERT INTO rme00102 (empcdempn, rmenufacc, prvcdprvn, artcdartn, rmenulotc, rmefecadd, rmepzacan)
                        VALUES (:empcdempn, :rmenufacc, 15, :artcdartn, :rmenulotc, :rmefecadd, :rmepzacan)
                    `, {
                        replacements: {
                            empcdempn: id_empresa_sys_anterior, rmenufacc,
                            artcdartn: c.cod_int_artic, rmenulotc: lote.lote,
                            rmefecadd: parseFechaVenci(lote.fecha_venci),
                            rmepzacan: lote.cantidad,
                        },
                        type: QueryTypes.INSERT,
                        transaction: tPoly,
                    });
                }
            }

            await tPoly.commit();
            console.log(`[POS_ANTIGUO] Insertado — ${rmenufacc}`);
        } catch (err) {
            await tPoly.rollback();
            console.error(`[POS_ANTIGUO] Error al insertar — ${rmenufacc}:`, err);
            throw err;
        }
    },

    // ── CFDI Traslado (T) — para clientes empresa propia ─────────────────────
    // No genera CxC ni remisión. Solo registra la salida de inventario y
    // timbrá un CFDI tipo T (traslado) en Facturapi.
    _timbrarTraslado: async ({
        cab, conceptos, id_empresa, id_empleado,
    }: {
        cab:         import('../interfaces/Facturacion.types').DatosFacturacionCabecera;
        conceptos:   ConceptoFacturacion[];
        id_empresa:  string;
        id_empleado: string;
    }) => {
        const totales  = calcularTotales(conceptos);
        const folio    = await FacturacionRepository.getSiguienteFolio();
        const leyenda  = cab.leyenda_factura_empre
            ?? `Traslado Pedido: ${cab.cod_int_pedido_alm}`;

        // ── 1. Registrar factura (tipo T) + stock + kardex en transacción ──────
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi:        'T',
                origen_factura:   'TRA',
                id_pedido_alm:    cab.id_pedido_alm,
                id_cliente_alm:   cab.id_cliente_alm,
                id_metodo_pago:   null,
                id_forma_pago:    null,
                uso_cfdi:         null,
                subtotal:         totales.subtotal,
                iva:              totales.iva,
                total:            totales.total,
                estatus_factura:  'GEN',          // Generado, no timbrado
                conceptos: conceptos.map(c => ({
                    id_articulo:     c.id_articulo,
                    descripcion:     c.descripcion,
                    cantidad:        c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea:  c.subtotal_linea,
                    tasa_iva:        c.tasa_iva,
                })),
            }, t);
            id_factura = factura.id_factura;

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura,
                cod_pedido:    cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── 2. Generar PDF de traslado (sin timbrado SAT) ─────────────────────
        const now    = new Date();
        const fechaStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

        const pdfBuffer = await generarTrasladoPDFBuffer({
            folio,
            fecha_emision:          fechaStr,
            cod_int_pedido:         cab.cod_int_pedido_alm,
            nombre_agente:          cab.nombre_agente ?? null,
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            nom_empre:              cab.nom_empre,
            rfc_empre:              cab.rfc_empre,
            razon_social:           cab.razon_social_cliente,
            rfc_receptor:           cab.rfc_cliente,
            calle_receptor:         cab.calle_cliente,
            colonia_receptor:       cab.colonia_cliente,
            municipio_receptor:     cab.municipio_cliente,
            estado_receptor:        cab.estado_cliente,
            subtotal:               totales.subtotal,
            iva:                    totales.iva,
            total:                  totales.total,
            items: conceptos.map(c => ({
                descripcion:     c.descripcion,
                cantidad:        c.cantidad,
                precio_unitario: c.precio_unitario,
                subtotal_linea:  c.subtotal_linea,
                tasa_iva:        c.tasa_iva,
                cod_barras:      c.cod_barras,
                unidad:          c.desc_medida,
                lotes:           c.lotes.map(l => ({
                    lote:        l.lote,
                    fecha_venci: l.fecha_venci,
                    cantidad:    l.cantidad,
                })),
            })),
        });

        if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
        const pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}.pdf`);
        fs.writeFileSync(pdf_url, pdfBuffer);

        await Facturas.update(
            { pdf_url },
            { where: { id_factura } },
        );

        // ── 3. Insertar en BD vieja (dbPoly) ─────────────────────────────────
        await FacturacionService._insertarEnPOSAntiguo({
            prefijo:               'TRA',
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            folio,
            plazo_pago:            cab.plazo_pago_cliente,
            total:                 totales.total,
            conceptos,
        });

        // ── 4. Generar documentos de traspaso (normales + receta) ─────────────
        const itemsTraspaso: TraspasoItem[] = conceptos.map(c => ({
            descripcion:     c.descripcion,
            cantidad:        c.cantidad,
            cod_int_artic:   c.cod_int_artic,
            cod_barras:      c.cod_barras,
            necesita_receta: c.necesita_receta,
            lotes:           c.lotes,
        }));

        const fechaDoc    = new Date();
        const fechaDocStr = `${String(fechaDoc.getDate()).padStart(2,'0')}/${String(fechaDoc.getMonth()+1).padStart(2,'0')}/${String(fechaDoc.getFullYear()).slice(-2)}`;

        const pdfTraspasoBuffer = await generarTraspasoCompletoPDFBuffer({
            folio,
            folio_interno:      folio,
            fecha:              fechaDocStr,
            cod_int_pedido:     cab.cod_int_pedido_alm,
            ruta:               null,
            razon_social:       cab.razon_social_cliente,
            rfc_receptor:       cab.rfc_cliente,
            calle_receptor:     cab.calle_cliente,
            colonia_receptor:   cab.colonia_cliente,
            municipio_receptor: cab.municipio_cliente,
            estado_receptor:    cab.estado_cliente,
            cp_receptor:        cab.domicilio_fiscal,
            telefono_receptor:  null,
            nom_empre:          cab.nom_empre,
            rfc_empre:          cab.rfc_empre,
        }, itemsTraspaso);

        const traspaso_pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}_traspaso.pdf`);
        fs.writeFileSync(traspaso_pdf_url, pdfTraspasoBuffer);

        // ── 5. Encolar en trabajo_impresion ───────────────────────────────────
        try {
            // Buscar impresora LASER activa de la empresa (si no hay, queda null)
            const impresora = await Impresora.findOne({
                where: { tipo_impresora: 'LASER', activa: true },
                order: [['createdAt', 'ASC']],
            });

            await Trabajo_Impresion.create({
                cod_interno_pedido: cab.cod_int_pedido_alm,
                id_impresora:       impresora?.id_impresora ?? null,
                tipo_documento:     'TRASPASO',
                referencia_codigo:  `TRA-${cab.id_empresa_sys_anterior}-${folio}`,
                payload: {
                    tipo:         'pdf',
                    ruta_archivo: traspaso_pdf_url,
                },
                estado:         'PENDIENTE',
                solicitado_por: id_empleado ?? null,
            });
        } catch (errImp) {
            console.error('[TRASLADO] No se pudo encolar trabajo de impresión:', errImp);
            // No lanzar — no es crítico para el traslado
        }

        return {
            flujo:          'EMPRESA_PROPIA',
            total_facturas: 1,
            facturas: [{ id_factura, folio, uuid_sat: null, pdf_url, xml_url: null, id_remision: null }],
            traspaso_pdf:   traspaso_pdf_url,
        };
    },

    // ── Timbrar Egreso (Nota de Crédito) ─────────────────────────────────────
    timbrarEgreso: async (dto: ITimbrarEgresoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura_origen);
        if (!origen)                    throw new Error('Factura origen no encontrada');
        if (origen.tipo_cfdi !== 'I')   throw new Error('Solo se puede crear nota de crédito de facturas tipo Ingreso');
        if (!origen.uuid_sat)           throw new Error('La factura origen no está timbrada (sin UUID SAT)');
        if (!dto.detalles?.length)      throw new Error('Debes especificar al menos un artículo a acreditar');

        const detallesEgreso = dto.detalles.map(d => {
            const original = origen.detalles.find(o => o.id_articulo === d.id_articulo);
            if (!original) throw new Error(`Artículo ${d.id_articulo} no existe en la factura origen`);
            if (d.cantidad > original.cantidad_facturada) {
                throw new Error(`La cantidad a acreditar (${d.cantidad}) excede la facturada (${original.cantidad_facturada}) para el artículo ${d.id_articulo}`);
            }
            const subtotal_linea = +(d.cantidad * original.precio_artic).toFixed(2);
            return {
                id_articulo:     original.id_articulo,
                descripcion:     original.descripcion_articulo,
                cantidad:        d.cantidad,
                precio_unitario: original.precio_artic,
                subtotal_linea,
                tasa_iva:        original.tasa_iva,
                cve_sat:         original.cve_sat,
                sat_medida:      original.sat_medida,
                desc_medida:     original.desc_medida,
            };
        });

        const subtotal = detallesEgreso.reduce((s, d) => s + d.subtotal_linea, 0);
        const iva      = detallesEgreso.reduce((s, d) => s + +(d.subtotal_linea * d.tasa_iva).toFixed(2), 0);
        const total    = +(subtotal + iva).toFixed(2);

        const folio = await FacturacionRepository.getSiguienteFolio();

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

        try {
            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'E',
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
                    relationship: '01',
                    documents: [origen.uuid_sat],   // strings, no objetos
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

            const [datos, cab] = await Promise.all([
                FacturacionRepository.getFacturaParaTimbrar(id_factura),
                FacturacionRepository.getCabecera(factura.id_pedido_alm, id_empresa),
            ]);
            if (!datos)                  throw new Error('No se encontraron los datos de la factura');
            if (!datos.detalles?.length) throw new Error('La factura no tiene conceptos registrados');

            const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
            const folio            = Number(factura.folio_factura);
            const leyenda          = cab.leyenda_factura_empre
                ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'I',
                customer: {
                    legal_name: esPublicoGeneral ? 'PUBLICO EN GENERAL' : datos.razon_social_cliente,
                    tax_id:     datos.rfc_cliente,
                    tax_system: esPublicoGeneral ? '616' : datos.regimen_fiscal_cliente,
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
            if (!datos)                    throw new Error('No se encontraron los datos de la factura E');
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
                    documents: [factura.uuid_relacionado],   // strings UUID
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
            if (!origen)          throw new Error('Factura origen no encontrada');
            if (!origen.uuid_sat) throw new Error('La factura origen no está timbrada');

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
        if (!origen)                  throw new Error('Factura no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede generar complemento de pago de facturas tipo Ingreso');
        if (!origen.uuid_sat)         throw new Error('La factura no está timbrada (sin UUID SAT)');

        const moneda         = dto.moneda ?? 'MXN';
        const saldo_insoluto = +(dto.saldo_anterior - dto.monto_pago).toFixed(2);
        const folio          = await FacturacionRepository.getSiguienteFolio();

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
                id_factura:       dto.id_factura,
                id_pago_cxc:      dto.id_pago_cxc ?? null,
                fecha_pago:       new Date(dto.fecha_pago),
                forma_de_pago:    dto.id_forma_pago,
                moneda,
                monto_pagado:     dto.monto_pago,
                num_parcialidad:  dto.num_parcialidad,
                saldo_anterior:   dto.saldo_anterior,
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

        try {
            const respuesta = await (facturapiClient.invoices as any).create({
                type:    'P',
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

            await FacturaPagoCFDI.update({
                uuid_cfdi_pago:   respuesta.uuid,
                pdf_url:          respuesta.pdf_url,
                xml_url:          respuesta.xml_url,
                estatus_timbrado: 'TIM',
            }, { where: { id_pago_cfdi: id_pago_cfdi! } });

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
