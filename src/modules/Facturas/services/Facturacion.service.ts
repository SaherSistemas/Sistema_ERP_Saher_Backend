import fs from 'fs';
import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal, dbPoly } from '../../../config/db';
import { FacturacionRepository } from '../repositories/Facturacion.repository';
import { ConceptoFacturacion } from '../interfaces/Facturacion.types';
import {
    IGenerarFacturaDTO,
    IDetalleEgresoDTO,
    ITimbrarEgresoDTO,
    ITimbrarPagoDTO,
} from '../interfaces/Facturacion.dto';
import { RUTA_FACTURACION, RUTA_PDFS } from '../helpers/pdf.helper';
import { generarTrasladoPDFBuffer } from '../helpers/traslado.pdf';
import { generarTraspasoCompletoPDFBuffer, TraspasoItem } from '../helpers/traspaso.pdf';
import { fmt2, fmt4 } from '../helpers/sat.helper';
import {
    generarTxtIngreso,
    generarTxtEgreso,
    generarTxtPago,
    derivarSeries,
    ConceptoTxt,
    EmisorTxt,
    ReceptorTxt,
} from '../helpers/cfdi_txt.helper';
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
import EmpresaSucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor';
import Lote_Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Lote_Factura_Compra_Proveedor';
import { v4 as uuidv4 } from 'uuid';

export { IGenerarFacturaDTO, IDetalleEgresoDTO, ITimbrarEgresoDTO, ITimbrarPagoDTO };

function fechaVenciToDate(fechaVenci: string): string {
    const [mes, anio] = (fechaVenci ?? '').split('/');
    if (!mes || !anio) return fechaVenci;
    return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

async function getLotesPorPedido(id_pedido_alm: string): Promise<
    Map<string, { lote: string; fecha_caducidad: string; cantidad: number }[]>
> {
    const rows = await dbLocal.query<{
        id_articulo:    string;
        numero_lote:    string;
        fecha_caducidad: string;
        cantidad:       number;
    }>(`
        SELECT
            dpa.id_articulo,
            COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS numero_lote,
            TO_CHAR(COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal)::date, 'YYYY-MM-DD') AS fecha_caducidad,
            dpal.cantidad
        FROM detalle_pedido_almacen     dpa
        JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
        JOIN lote_articulo_sucursal      las  ON las.id_lote_sucursal           = dpal.id_lote_sucursal
        WHERE dpa.id_pedido_almacen = :id_pedido_alm
          AND dpal.cantidad > 0
    `, { replacements: { id_pedido_alm }, type: QueryTypes.SELECT });

    const mapa = new Map<string, { lote: string; fecha_caducidad: string; cantidad: number }[]>();
    for (const r of rows) {
        const lista = mapa.get(r.id_articulo) ?? [];
        lista.push({ lote: r.numero_lote, fecha_caducidad: r.fecha_caducidad, cantidad: Number(r.cantidad) });
        mapa.set(r.id_articulo, lista);
    }
    return mapa;
}

async function obtenerEmisor(id_empresa: string): Promise<EmisorTxt & { serie_facturacion_empre: string } | null> {
    const e = await EmpresaSucursal.findByPk(id_empresa, {
        attributes: ['nom_empre', 'rfc_empre', 'regimen_fiscal_empre', 'serie_facturacion_empre', 'id_colonia_empre'],
        raw: true,
    }) as any;
    if (!e) return null;
    return {
        nom_empre:              e.nom_empre,
        rfc_empre:              e.rfc_empre,
        regimen_fiscal_empre:   e.regimen_fiscal_empre ?? '601',
        serie_ingreso:          e.serie_facturacion_empre ?? 'FSH',
        lugar_expedicion:       e.lugar_expedicion ?? '80160',
        serie_facturacion_empre: e.serie_facturacion_empre ?? 'FSH',
    };
}

export const FacturacionService = {

    // ── Genera .txt de Ingreso (timbrado manual con facturador externo) ───────
    generarTxt: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_empleado } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        const dias_credito   = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
        const folio          = cab.siguiente_folio;
        const leyenda        = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const emisor: EmisorTxt = {
            nom_empre:            cab.nom_empre,
            rfc_empre:            cab.rfc_empre,
            regimen_fiscal_empre: cab.regimen_fiscal_empre,
            serie_ingreso:        cab.serie_facturacion_empre,
            lugar_expedicion:     cab.lugar_expedicion,
        };
        const receptor: ReceptorTxt = {
            razon_social:    cab.razon_social_cliente,
            rfc:             cab.rfc_cliente,
            domicilio_fiscal: cab.domicilio_fiscal,
            regimen_fiscal:  cab.regimen_fiscal_cliente,
            uso_cfdi:        cab.uso_cfdi,
        };
        const conceptosTxt: ConceptoTxt[] = conceptos.map(c => ({
            cve_sat:         c.cve_sat,
            sat_medida:      c.sat_medida,
            desc_medida:     c.desc_medida,
            cod_barras:      c.cod_barras,
            cantidad:        c.cantidad,
            descripcion:     c.descripcion,
            precio_unitario: c.precio_unitario,
            descuento:       c.descuento,
            subtotal_linea:  c.subtotal_linea,
            tasa_iva:        c.tasa_iva,
            impuesto_sat:    c.impuesto_sat,
            tipo_factor:     c.tipo_factor,
            lotes:           c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
        }));

        const { ruta: rutaArchivo } = generarTxtIngreso({
            emisor, receptor, folio,
            forma_pago:  cab.forma_pago,
            metodo_pago: cab.metodo_pago,
            conceptos:   conceptosTxt,
            leyenda,
            nombreArchivo: `${cab.serie_facturacion_empre}${folio}_${cab.cod_int_pedido_alm}.txt`,
        });

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            const totales = calcularTotales(conceptos);

            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi: 'I',
                origen_factura: 'PED',
                id_pedido_alm: cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_metodo_pago: cab.metodo_pago,
                id_forma_pago: cab.forma_pago,
                uso_cfdi: cab.uso_cfdi,
                subtotal: totales.subtotal,
                iva: totales.iva,
                total: totales.total,
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva,
                })),
            }, t);

            await crearCxCyRemision({
                factura_id: factura.id_factura,
                cab,
                totales,
                conceptos,
                dias_credito,
                esPublicoGeneral,
            }, t);

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura: factura.id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();

            return {
                ruta: rutaArchivo,
                folio,
                id_factura: factura.id_factura,
                flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
                credito_generado: true,
            };

        } catch (error) {
            await t.rollback();
            if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
            throw error;
        }
    },

    // ── Timbrar Ingreso — genera .txt y registra en BD ────────────────────────
    timbrarIngreso: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_cliente_real, id_empleado } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

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

        type RegistroIntermedio = {
            id_factura: string;
            folio: number;
            totales: ReturnType<typeof calcularTotales>;
            id_remision: string | null;
            conceptosParte: ConceptoFacturacion[];
        };

        const registros: RegistroIntermedio[] = [];
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            for (let i = 0; i < particiones.length; i++) {
                const conceptosParte = particiones[i];
                const totales = calcularTotales(conceptosParte);
                const folio   = basefolio + i;

                const factura = await FacturacionRepository.registrarFactura({
                    folio,
                    tipo_cfdi: 'I',
                    origen_factura: 'PED',
                    id_pedido_alm: cab.id_pedido_alm,
                    id_cliente_alm: cab.id_cliente_alm,
                    id_metodo_pago: cab.metodo_pago,
                    id_forma_pago: cab.forma_pago,
                    uso_cfdi: cab.uso_cfdi,
                    subtotal: totales.subtotal,
                    iva: totales.iva,
                    total: totales.total,
                    conceptos: conceptosParte.map(c => ({
                        id_articulo: c.id_articulo,
                        descripcion: c.descripcion,
                        cantidad: c.cantidad,
                        precio_unitario: c.precio_unitario,
                        subtotal_linea: c.subtotal_linea,
                        tasa_iva: c.tasa_iva,
                    })),
                }, t);

                const id_remision = await crearCxCyRemision({
                    factura_id: factura.id_factura,
                    cab: { ...cab, id_cliente_alm: id_cliente_real ?? cab.id_cliente_alm },
                    totales,
                    conceptos: conceptosParte,
                    dias_credito,
                    esPublicoGeneral,
                }, t);

                registros.push({ id_factura: factura.id_factura, folio, totales, id_remision, conceptosParte });
            }

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura: registros[0].id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
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

        // ── Generar .txt por cada partición ──────────────────────────────────
        const emisor: EmisorTxt = {
            nom_empre:            cab.nom_empre,
            rfc_empre:            cab.rfc_empre,
            regimen_fiscal_empre: cab.regimen_fiscal_empre,
            serie_ingreso:        cab.serie_facturacion_empre,
            lugar_expedicion:     cab.lugar_expedicion,
        };
        const receptor: ReceptorTxt = {
            razon_social:    esPublicoGeneral ? 'PUBLICO EN GENERAL' : cab.razon_social_cliente,
            rfc:             cab.rfc_cliente,
            domicilio_fiscal: cab.domicilio_fiscal,
            regimen_fiscal:  esPublicoGeneral ? '616' : cab.regimen_fiscal_cliente,
            uso_cfdi:        cab.uso_cfdi,
        };

        const facturas = registros.map(({ id_factura, folio, id_remision, conceptosParte }) => {
            try {
                const conceptosTxt: ConceptoTxt[] = conceptosParte.map(c => ({
                    cve_sat:         c.cve_sat,
                    sat_medida:      c.sat_medida,
                    desc_medida:     c.desc_medida,
                    cod_barras:      c.cod_barras,
                    cantidad:        c.cantidad,
                    descripcion:     c.descripcion,
                    precio_unitario: c.precio_unitario,
                    descuento:       c.descuento,
                    subtotal_linea:  c.subtotal_linea,
                    tasa_iva:        c.tasa_iva,
                    impuesto_sat:    c.impuesto_sat,
                    tipo_factor:     c.tipo_factor,
                    lotes:           c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
                }));
                const { ruta } = generarTxtIngreso({
                    emisor, receptor, folio,
                    forma_pago:  cab.forma_pago,
                    metodo_pago: cab.metodo_pago,
                    conceptos:   conceptosTxt,
                    leyenda,
                    nombreArchivo: `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`,
                });
                return { id_factura, folio, ruta_txt: ruta, id_remision };
            } catch (txtErr: any) {
                console.warn(`[timbrarIngreso] No se pudo generar .txt folio ${folio}:`, txtErr.message);
                return { id_factura, folio, id_remision, error: txtErr.message };
            }
        });

        // ── Empresa propia → insertar en POS viejo ────────────────────────────
        if (cab.id_empresa_sys_anterior != null) {
            const primerFolio = registros[0].folio;
            try {
                await FacturacionService._insertarEnPOSAntiguo({
                    prefijo: 'FAC',
                    id_empresa_sys_anterior: cab.id_empresa_sys_anterior,
                    folio: primerFolio,
                    plazo_pago: cab.plazo_pago_cliente,
                    total: registros[0].totales.total,
                    conceptos,
                });
            } catch (errPoly) {
                console.error('[FACTURA_EMPRESA] Error al insertar en BD vieja:', errPoly);
            }

            if (cab.id_empresa_sys_nuevo) {
                try {
                    const lotesPorArticulo = await getLotesPorPedido(cab.id_pedido_alm);
                    const primerRegistro   = registros[0];
                    const id_factura_proveedor = uuidv4();
                    const hoy = new Date();
                    await Factura_Compra_Proveedor.create({
                        id_factura_proveedor,
                        id_compra_prove_factura: null,
                        tipo_origen: 'TRASLADO',
                        id_empresa_emisora: id_empresa,
                        id_empresa_receptora: cab.id_empresa_sys_nuevo,
                        folio_factura_proveedor: `FAC-${primerRegistro.folio}`,
                        estado_factura_proveedor: 'C',
                        fecha_emision: hoy,
                        fecha_vencimiento: hoy,
                        total_factura_proveedor: primerRegistro.totales.total,
                        total_iva_factura: primerRegistro.totales.iva,
                        total_recibido_factura: 0,
                        total_iva_recibido_factura: 0,
                        estatus_pago_factura: 'TRASLADO',
                        url_PDF: null,
                        url_XML: null,
                    });
                    for (const c of conceptos) {
                        const id_det = uuidv4();
                        await Detalle_Factura_Compra_Proveedor.create({
                            id_factura_proveedor_detalle: id_det,
                            id_factura_compra_proveedor: id_factura_proveedor,
                            id_detcompsol: null,
                            id_artic: c.id_articulo,
                            cantidad_articulo_facturada: c.cantidad,
                            precio_articulo_factura: c.precio_unitario,
                            descuento_articulo_factura: 0,
                            iva_articulo_factura: c.tasa_iva,
                            checado: false,
                        });
                        const lotes = lotesPorArticulo.get(c.id_articulo) ?? [];
                        if (lotes.length) {
                            await Lote_Factura_Compra_Proveedor.bulkCreate(
                                lotes.map(l => ({
                                    id_lote_factura_compra_proveedor: uuidv4(),
                                    id_det_factura_proveedor: id_det,
                                    numero_lote: l.lote,
                                    fecha_caducidad: l.fecha_caducidad,
                                    cantidad_lote: l.cantidad,
                                    precio_articulo_factura: c.precio_unitario,
                                    observacion_lote: null,
                                }))
                            );
                        }
                    }
                } catch (errFpr) {
                    console.error('[FACTURA_EMPRESA] No se pudo crear factura por recibir en nuevo ERP:', errFpr);
                }
            }
        }

        return {
            flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
            total_facturas: facturas.length,
            facturas,
        };
    },

    // ── Helper compartido: insert en POS viejo (rme0010/rme00101/rme00102) ────
    _insertarEnPOSAntiguo: async ({
        prefijo, id_empresa_sys_anterior, folio, plazo_pago, total, conceptos,
    }: {
        prefijo: 'TRA' | 'FAC';
        id_empresa_sys_anterior: number;
        folio: number;
        plazo_pago: number;
        total: number;
        conceptos: ConceptoFacturacion[];
    }) => {
        const parseFechaVenci = (f: string): string => {
            const [mes, anio] = f.split('/');
            const m = parseInt(mes, 10);
            const a = parseInt(anio, 10);
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
                        precio: c.precio_unitario, subtotal: c.subtotal_linea,
                        poriva: c.tasa_iva * 100,
                        imiva: +(c.subtotal_linea * c.tasa_iva).toFixed(2),
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
    _timbrarTraslado: async ({
        cab, conceptos, id_empresa, id_empleado,
    }: {
        cab: import('../interfaces/Facturacion.types').DatosFacturacionCabecera;
        conceptos: ConceptoFacturacion[];
        id_empresa: string;
        id_empleado: string;
    }) => {
        const totales = calcularTotales(conceptos);
        const folio   = await FacturacionRepository.getSiguienteFolio();
        const leyenda = cab.leyenda_factura_empre
            ?? `Traslado Pedido: ${cab.cod_int_pedido_alm}`;

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi: 'T',
                origen_factura: 'TRA',
                id_pedido_alm: cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_metodo_pago: null,
                id_forma_pago: null,
                uso_cfdi: null,
                subtotal: totales.subtotal,
                iva: totales.iva,
                total: totales.total,
                estatus_factura: 'GEN',
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva,
                })),
            }, t);
            id_factura = factura.id_factura;

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
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

        const now     = new Date();
        const fechaStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const pdfBuffer = await generarTrasladoPDFBuffer({
            folio,
            fecha_emision: fechaStr,
            cod_int_pedido: cab.cod_int_pedido_alm,
            nombre_agente: cab.nombre_agente ?? null,
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            nom_empre: cab.nom_empre,
            rfc_empre: cab.rfc_empre,
            razon_social: cab.razon_social_cliente,
            rfc_receptor: cab.rfc_cliente,
            calle_receptor: cab.calle_cliente,
            colonia_receptor: cab.colonia_cliente,
            municipio_receptor: cab.municipio_cliente,
            estado_receptor: cab.estado_cliente,
            subtotal: totales.subtotal,
            iva: totales.iva,
            total: totales.total,
            items: conceptos.map(c => ({
                descripcion: c.descripcion,
                cantidad: c.cantidad,
                precio_unitario: c.precio_unitario,
                subtotal_linea: c.subtotal_linea,
                tasa_iva: c.tasa_iva,
                cod_barras: c.cod_barras,
                unidad: c.desc_medida,
                lotes: c.lotes.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
            })),
        });

        if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
        const pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}.pdf`);
        fs.writeFileSync(pdf_url, pdfBuffer);

        await Facturas.update({ pdf_url }, { where: { id_factura } });

        await FacturacionService._insertarEnPOSAntiguo({
            prefijo: 'TRA',
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            folio,
            plazo_pago: cab.plazo_pago_cliente,
            total: totales.total,
            conceptos,
        });

        const itemsTraspaso: TraspasoItem[] = conceptos.map(c => ({
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            cod_int_artic: c.cod_int_artic,
            cod_barras: c.cod_barras,
            necesita_receta: c.necesita_receta,
            lotes: c.lotes,
        }));

        const fechaDoc    = new Date();
        const fechaDocStr = `${String(fechaDoc.getDate()).padStart(2, '0')}/${String(fechaDoc.getMonth() + 1).padStart(2, '0')}/${String(fechaDoc.getFullYear()).slice(-2)}`;

        const pdfTraspasoBuffer = await generarTraspasoCompletoPDFBuffer({
            folio, folio_interno: folio, fecha: fechaDocStr,
            cod_int_pedido: cab.cod_int_pedido_alm, ruta: null,
            razon_social: cab.razon_social_cliente, rfc_receptor: cab.rfc_cliente,
            calle_receptor: cab.calle_cliente, colonia_receptor: cab.colonia_cliente,
            municipio_receptor: cab.municipio_cliente, estado_receptor: cab.estado_cliente,
            cp_receptor: cab.domicilio_fiscal, telefono_receptor: null,
            nom_empre: cab.nom_empre, rfc_empre: cab.rfc_empre,
        }, itemsTraspaso);

        const traspaso_pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}_traspaso.pdf`);
        fs.writeFileSync(traspaso_pdf_url, pdfTraspasoBuffer);

        try {
            const impresora = await Impresora.findOne({
                where: { tipo_impresora: 'LASER', activa: true },
                order: [['createdAt', 'ASC']],
            });
            await Trabajo_Impresion.create({
                cod_interno_pedido: cab.cod_int_pedido_alm,
                id_impresora: impresora?.id_impresora ?? null,
                tipo_documento: 'TRASPASO',
                referencia_codigo: `TRA-${cab.id_empresa_sys_anterior}-${folio}`,
                payload: { tipo: 'pdf', ruta_archivo: traspaso_pdf_url },
                estado: 'PENDIENTE',
                solicitado_por: id_empleado ?? null,
            });
        } catch (errImp) {
            console.error('[TRASLADO] No se pudo encolar trabajo de impresión:', errImp);
        }

        if (cab.id_empresa_sys_nuevo) {
            try {
                const lotesPorArticulo     = await getLotesPorPedido(cab.id_pedido_alm);
                const id_factura_proveedor = uuidv4();
                const hoy = new Date();
                await Factura_Compra_Proveedor.create({
                    id_factura_proveedor, id_compra_prove_factura: null,
                    tipo_origen: 'TRASLADO',
                    id_empresa_emisora: id_empresa, id_empresa_receptora: cab.id_empresa_sys_nuevo,
                    folio_factura_proveedor: `TRA-${folio}`, estado_factura_proveedor: 'C',
                    fecha_emision: hoy, fecha_vencimiento: hoy,
                    total_factura_proveedor: totales.total, total_iva_factura: totales.iva,
                    total_recibido_factura: 0, total_iva_recibido_factura: 0,
                    estatus_pago_factura: 'TRASLADO', url_PDF: pdf_url, url_XML: null,
                });
                for (const c of conceptos) {
                    const id_det = uuidv4();
                    await Detalle_Factura_Compra_Proveedor.create({
                        id_factura_proveedor_detalle: id_det,
                        id_factura_compra_proveedor: id_factura_proveedor,
                        id_detcompsol: null, id_artic: c.id_articulo,
                        cantidad_articulo_facturada: c.cantidad,
                        precio_articulo_factura: c.precio_unitario,
                        descuento_articulo_factura: 0, iva_articulo_factura: c.tasa_iva, checado: false,
                    });
                    const lotes = lotesPorArticulo.get(c.id_articulo) ?? [];
                    if (lotes.length) {
                        await Lote_Factura_Compra_Proveedor.bulkCreate(
                            lotes.map(l => ({
                                id_lote_factura_compra_proveedor: uuidv4(),
                                id_det_factura_proveedor: id_det,
                                numero_lote: l.lote, fecha_caducidad: l.fecha_caducidad,
                                cantidad_lote: l.cantidad, precio_articulo_factura: c.precio_unitario,
                                observacion_lote: null,
                            }))
                        );
                    }
                }
            } catch (errFpr) {
                console.error('[TRASLADO] No se pudo crear factura por recibir en nuevo ERP:', errFpr);
            }
        }

        return {
            flujo: 'EMPRESA_PROPIA',
            total_facturas: 1,
            facturas: [{ id_factura, folio, uuid_sat: null, pdf_url, xml_url: null, id_remision: null }],
            traspaso_pdf: traspaso_pdf_url,
        };
    },

    // ── Egreso (Nota de Crédito) — genera .txt ────────────────────────────────
    timbrarEgreso: async (dto: ITimbrarEgresoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura_origen);
        if (!origen) throw new Error('Factura origen no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede crear nota de crédito de facturas tipo Ingreso');
        if (!dto.detalles?.length) throw new Error('Debes especificar al menos un artículo a acreditar');

        const detallesEgreso = dto.detalles.map(d => {
            const original = origen.detalles.find(o => o.id_articulo === d.id_articulo);
            if (!original) throw new Error(`Artículo ${d.id_articulo} no existe en la factura origen`);
            if (d.cantidad > original.cantidad_facturada) {
                throw new Error(`La cantidad a acreditar (${d.cantidad}) excede la facturada (${original.cantidad_facturada})`);
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
        const folio    = await FacturacionRepository.getSiguienteFolio();

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;

        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio, tipo_cfdi: 'E', origen_factura: 'CXC',
                id_cliente_alm: origen.id_cliente_alm,
                id_forma_pago: origen.id_forma_pago,
                uso_cfdi: 'G02',
                subtotal: +subtotal.toFixed(2), iva: +iva.toFixed(2), total,
                id_factura_origen: dto.id_factura_origen,
                uuid_relacionado: origen.uuid_sat ?? undefined,
                conceptos: detallesEgreso,
            }, t);
            id_factura = factura.id_factura;
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const empresa = dto.id_empresa ? await obtenerEmisor(dto.id_empresa) : null;
            if (empresa) {
                const series = derivarSeries(empresa.serie_ingreso);
                const { ruta } = generarTxtEgreso({
                    emisor: empresa,
                    receptor: {
                        razon_social:    origen.razon_social_cliente,
                        rfc:             origen.rfc_cliente,
                        domicilio_fiscal: origen.domicilio_fiscal,
                        regimen_fiscal:  origen.regimen_fiscal_cliente,
                        uso_cfdi:        'G02',
                    },
                    folio,
                    uuid_relacionado: origen.uuid_sat ?? '',
                    conceptos: detallesEgreso.map(d => ({
                        cve_sat: d.cve_sat, sat_medida: d.sat_medida, desc_medida: d.desc_medida,
                        cod_barras: '001', cantidad: d.cantidad, descripcion: d.descripcion,
                        precio_unitario: d.precio_unitario, descuento: 0,
                        subtotal_linea: d.subtotal_linea, tasa_iva: d.tasa_iva,
                        impuesto_sat: '002', tipo_factor: 'Tasa',
                    })),
                    leyenda: `Nota de Credito por Devolucion de Factura Interna ${series.ingreso}${origen.folio_factura ?? folio}`,
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarEgreso] No se pudo generar .txt:', txtErr.message);
        }

        return {
            id_factura,
            id_factura_origen: dto.id_factura_origen,
            folio,
            subtotal: +subtotal.toFixed(2),
            iva: +iva.toFixed(2),
            total,
            estatus: 'PEN',
            ruta_txt,
        };
    },

    // ── Regenerar .txt de una factura existente (desde módulo de facturas) ────
    reintentarTimbrado: async (id_factura: string, id_empresa: string) => {

        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw new Error('Factura no encontrada');
        if (factura.estatus_factura === 'CAN') throw new Error('La factura está cancelada');

        const empresa = await obtenerEmisor(id_empresa);
        if (!empresa) throw new Error('Empresa no encontrada');

        // ── Tipo I: Ingreso ───────────────────────────────────────────────────
        if (factura.tipo_cfdi === 'I') {
            if (!factura.id_pedido_alm) throw new Error('La factura no tiene pedido asociado');

            const [cab, conceptos] = await Promise.all([
                FacturacionRepository.getCabecera(factura.id_pedido_alm, id_empresa),
                FacturacionRepository.getConceptos(factura.id_pedido_alm),
            ]);
            if (!conceptos.length) throw new Error('La factura no tiene conceptos registrados');

            const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;
            const folio   = Number(factura.folio_factura);
            const leyenda = cab.leyenda_factura_empre
                ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

            const { ruta } = generarTxtIngreso({
                emisor: {
                    nom_empre:            cab.nom_empre,
                    rfc_empre:            cab.rfc_empre,
                    regimen_fiscal_empre: cab.regimen_fiscal_empre,
                    serie_ingreso:        cab.serie_facturacion_empre,
                    lugar_expedicion:     cab.lugar_expedicion,
                },
                receptor: {
                    razon_social:    esPublicoGeneral ? 'PUBLICO EN GENERAL' : cab.razon_social_cliente,
                    rfc:             cab.rfc_cliente,
                    domicilio_fiscal: cab.domicilio_fiscal,
                    regimen_fiscal:  esPublicoGeneral ? '616' : cab.regimen_fiscal_cliente,
                    uso_cfdi:        cab.uso_cfdi,
                },
                folio,
                forma_pago:  cab.forma_pago,
                metodo_pago: cab.metodo_pago,
                conceptos: conceptos.map(c => ({
                    cve_sat: c.cve_sat, sat_medida: c.sat_medida, desc_medida: c.desc_medida,
                    cod_barras: c.cod_barras, cantidad: c.cantidad,
                    descripcion: c.descripcion,
                    precio_unitario: c.precio_unitario, descuento: c.descuento,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva, impuesto_sat: c.impuesto_sat, tipo_factor: c.tipo_factor,
                    lotes: c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
                })),
                leyenda,
                nombreArchivo: `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`,
            });

            return { id_factura, folio, ruta_txt: ruta, flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO' };
        }

        // ── Tipo E: Egreso ────────────────────────────────────────────────────
        if (factura.tipo_cfdi === 'E') {
            const datos = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
            if (!datos) throw new Error('No se encontraron los datos de la factura E');

            const series = derivarSeries(empresa.serie_ingreso);
            const folio  = Number(factura.folio_factura);
            const { ruta } = generarTxtEgreso({
                emisor: empresa,
                receptor: {
                    razon_social:    datos.razon_social_cliente,
                    rfc:             datos.rfc_cliente,
                    domicilio_fiscal: datos.domicilio_fiscal,
                    regimen_fiscal:  datos.regimen_fiscal_cliente,
                    uso_cfdi:        'G02',
                },
                folio,
                uuid_relacionado: factura.uuid_relacionado ?? datos.uuid_sat ?? '',
                conceptos: datos.detalles.map(d => ({
                    cve_sat: d.cve_sat, sat_medida: d.sat_medida, desc_medida: d.desc_medida,
                    cod_barras: '001', cantidad: d.cantidad_facturada,
                    descripcion: d.descripcion_articulo,
                    precio_unitario: d.precio_artic, descuento: 0,
                    subtotal_linea: +(d.cantidad_facturada * d.precio_artic).toFixed(2),
                    tasa_iva: d.tasa_iva, impuesto_sat: '002', tipo_factor: 'Tasa',
                })),
                leyenda: `Nota de Credito por Devolucion de Factura Interna ${series.ingreso}${folio}`,
            });

            return { id_factura, folio, ruta_txt: ruta };
        }

        // ── Tipo P: Complemento de Pago ───────────────────────────────────────
        if (factura.tipo_cfdi === 'P') {
            if (!factura.id_factura_origen) throw new Error('La factura P no tiene factura origen');

            const pagoCFDI = await FacturaPagoCFDI.findOne({
                where: { id_factura: factura.id_factura_origen },
                order: [['createdAt', 'DESC']],
            });
            if (!pagoCFDI) throw new Error('No se encontró el registro FacturaPagoCFDI');

            const origen = await FacturacionRepository.getFacturaParaTimbrar(factura.id_factura_origen);
            if (!origen) throw new Error('Factura origen no encontrada');

            const folio = Number(factura.folio_factura);
            const saldo_insoluto = +(Number(pagoCFDI.saldo_anterior) - Number(pagoCFDI.monto_pagado)).toFixed(2);

            const { ruta } = generarTxtPago({
                emisor: empresa,
                receptor: {
                    razon_social:    origen.razon_social_cliente,
                    rfc:             origen.rfc_cliente,
                    domicilio_fiscal: origen.domicilio_fiscal,
                    regimen_fiscal:  origen.regimen_fiscal_cliente,
                    uso_cfdi:        'CP01',
                },
                folio,
                fecha_pago:    new Date(pagoCFDI.fecha_pago).toISOString().split('T')[0],
                id_forma_pago: pagoCFDI.forma_de_pago,
                moneda:        pagoCFDI.moneda,
                documentos: [{
                    uuid_relacionado: origen.uuid_sat ?? '',
                    folio_factura:    origen.folio_factura ?? String(folio),
                    serie_factura:    empresa.serie_ingreso,
                    monto_pago:       Number(pagoCFDI.monto_pagado),
                    saldo_anterior:   Number(pagoCFDI.saldo_anterior),
                    saldo_insoluto,
                    num_parcialidad:  pagoCFDI.num_parcialidad,
                    moneda:           pagoCFDI.moneda,
                    tasa_iva:         0,
                }],
            });

            return { id_factura, folio, ruta_txt: ruta };
        }

        throw new Error(`Tipo de CFDI '${factura.tipo_cfdi}' no soportado`);
    },

    // ── Complemento de Pago — genera .txt ─────────────────────────────────────
    timbrarPago: async (dto: ITimbrarPagoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura);
        if (!origen) throw new Error('Factura no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede generar complemento de pago de facturas tipo Ingreso');

        const moneda         = dto.moneda ?? 'MXN';
        const saldo_insoluto = +(dto.saldo_anterior - dto.monto_pago).toFixed(2);
        const folio          = await FacturacionRepository.getSiguienteFolio();

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura_pago: string;
        let id_pago_cfdi: string;

        try {
            const facturaPago = await Facturas.create({
                folio_factura: String(folio),
                tipo_cfdi: 'P',
                origen_factura: 'CXC',
                fecha_emision: new Date(),
                subtotal_factura: 0,
                iva_factura: 0,
                total_factura: dto.monto_pago,
                estatus_factura: 'PEN',
                id_cliente_alm: origen.id_cliente_alm,
                id_factura_origen: dto.id_factura,
                uuid_relacionado: origen.uuid_sat,
            }, { transaction: t });
            id_factura_pago = facturaPago.id_factura;

            const pagoCFDI = await FacturaPagoCFDI.create({
                id_factura: dto.id_factura,
                id_pago_cxc: dto.id_pago_cxc ?? null,
                fecha_pago: new Date(dto.fecha_pago),
                forma_de_pago: dto.id_forma_pago,
                moneda,
                monto_pagado: dto.monto_pago,
                num_parcialidad: dto.num_parcialidad,
                saldo_anterior: dto.saldo_anterior,
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

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const empresa = dto.id_empresa ? await obtenerEmisor(dto.id_empresa) : null;
            if (empresa) {
                const { ruta } = generarTxtPago({
                    emisor: empresa,
                    receptor: {
                        razon_social:    origen.razon_social_cliente,
                        rfc:             origen.rfc_cliente,
                        domicilio_fiscal: origen.domicilio_fiscal,
                        regimen_fiscal:  origen.regimen_fiscal_cliente,
                        uso_cfdi:        'CP01',
                    },
                    folio,
                    fecha_pago:    dto.fecha_pago,
                    id_forma_pago: dto.id_forma_pago,
                    moneda,
                    documentos: [{
                        uuid_relacionado: origen.uuid_sat ?? '',
                        folio_factura:    origen.folio_factura ?? String(folio),
                        serie_factura:    empresa.serie_ingreso,
                        monto_pago:       dto.monto_pago,
                        saldo_anterior:   dto.saldo_anterior,
                        saldo_insoluto,
                        num_parcialidad:  dto.num_parcialidad,
                        moneda,
                        tasa_iva:         0,
                    }],
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarPago] No se pudo generar .txt:', txtErr.message);
        }

        return {
            id_factura_pago,
            id_pago_cfdi,
            folio,
            estatus: 'PEN',
            ruta_txt,
        };
    },

    // ── Consolidado de vales — genera .txt ────────────────────────────────────
    timbrarConsolidadoVales: async (dto: {
        id_empresa: string;
        id_empleado: string;
        id_cliente_alm: string | null;
        ids_pedidos: string[];
        conceptos: ConceptoFacturacion[];
        periodo: string;
    }) => {
        const { id_empresa, id_empleado, id_cliente_alm, conceptos, periodo } = dto;

        const empresa = await EmpresaSucursal.findByPk(id_empresa);
        if (!empresa) throw new Error('Empresa no encontrada');

        const totales = calcularTotales(conceptos);
        const folio   = await FacturacionRepository.getSiguienteFolio();
        const leyenda = `Vales de medicamentos empleados — ${periodo}`;

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio, tipo_cfdi: 'I', origen_factura: 'VAL',
                id_pedido_alm: dto.ids_pedidos[0],
                id_cliente_alm,
                id_metodo_pago: 'PUE', id_forma_pago: '01', uso_cfdi: 'G01',
                subtotal: totales.subtotal, iva: totales.iva, total: totales.total,
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo, descripcion: c.descripcion,
                    cantidad: c.cantidad, precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea, tasa_iva: c.tasa_iva,
                })),
            }, t);
            id_factura = factura.id_factura;
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const emisorData = await obtenerEmisor(id_empresa);
            if (emisorData) {
                const { ruta } = generarTxtIngreso({
                    emisor: emisorData,
                    receptor: {
                        razon_social:    'PUBLICO EN GENERAL',
                        rfc:             'XAXX010101000',
                        domicilio_fiscal: (empresa as any).cp_empre ?? '80000',
                        regimen_fiscal:  '616',
                        uso_cfdi:        'G01',
                    },
                    folio,
                    forma_pago:  '01',
                    metodo_pago: 'PUE',
                    conceptos: conceptos.map(c => ({
                        cve_sat: c.cve_sat, sat_medida: c.sat_medida, desc_medida: c.desc_medida,
                        cod_barras: c.cod_barras, cantidad: c.cantidad,
                        descripcion: buildDescripcionConcepto(c),
                        precio_unitario: c.precio_unitario, descuento: c.descuento,
                        subtotal_linea: c.subtotal_linea, tasa_iva: c.tasa_iva,
                        impuesto_sat: c.impuesto_sat, tipo_factor: c.tipo_factor,
                    })),
                    leyenda,
                    nombreArchivo: `FactDig${(empresa as any).serie_facturacion_empre ?? 'FSH'}${folio}-Ingresos.txt`,
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarConsolidadoVales] No se pudo generar .txt:', txtErr.message);
        }

        return { id_factura, folio, estatus: 'PEN', ruta_txt };
    },
};
