import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { Detalle_Compra_SolicitadoRepository } from '../Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository';
import { leerCfdi, ConceptoCfdi } from './Cfdi.parser';
import { extraerLotes, leerLineasPdf, ResultadoLotes } from './PdfLotes.parser';

// Análisis (solo lectura) del XML y el PDF de una factura de proveedor contra la orden de compra.
// NO guarda nada: devuelve lo que se entendió para que compras lo revise y lo aplique a la captura.

export type MetodoCoincidencia = 'CODIGO_PROVEEDOR' | 'CODIGO_BARRAS' | 'CODIGO_INTERNO' | 'DESCRIPCION';

export interface ConceptoAnalizado {
    indice: number;
    no_identificacion: string;
    descripcion: string;
    cantidad_xml: number;
    precio_xml: number;
    descuento_pct: number;
    iva_pct: number;
    importe_xml: number;
    // Artículo de la orden con el que coincidió (null = no está en la orden)
    orden: null | {
        id_detcompsol: string;
        id_artic: string;
        des_artic: string;
        cod_barr_artic: string;
        cantidad_pedida: number;
        cantidad_pendiente: number;
        precio_orden: number;
        metodo: MetodoCoincidencia;
    };
    // Lotes leídos del PDF
    pdf: {
        analizado: boolean;                 // se subió un PDF
        encontrado: boolean;                // el artículo se ubicó en el PDF
        lotes: Array<{ numero_lote: string; fecha_caducidad: string; cantidad: number; cantidad_inferida: boolean }>;
        suma_lotes: number;
        cuadra: boolean | null;
    };
    avisos: string[];
}

export interface AnalisisFactura {
    /** ORDEN = contra una orden de compra · DIRECTA = compra directa, contra el catálogo de artículos */
    modo: 'ORDEN' | 'DIRECTA';
    /** Proveedor de la factura (el elegido, o el que se encontró por el RFC del XML) */
    proveedor: { id_prove: string; nombre: string };
    encabezado: {
        folio: string;
        fecha: string;
        uuid: string;
        total: number;
        subtotal: number;
        moneda: string;
        rfc_emisor: string;
        nombre_emisor: string;
        tipo_comprobante: string;
    };
    avisos: string[];
    conceptos: ConceptoAnalizado[];
    // Artículos de la orden con pendiente que NO vienen en el XML
    pendientes_sin_xml: Array<{ id_detcompsol: string; des_artic: string; cod_barr_artic: string; cantidad_pendiente: number }>;
    resumen: {
        conceptos: number;
        en_orden: number;
        sin_orden: number;
        con_lotes: number;
        sin_lotes_en_pdf: number;
        lotes_no_cuadran: number;
    };
}

const norm = (s: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const sinCeros = (s: string) => s.replace(/^0+(?=\d)/, '');
const mismoCodigo = (a: string, b: string) => {
    const x = norm(a), y = norm(b);
    return !!x && !!y && (x === y || sinCeros(x) === sinCeros(y));
};
const tokens = (s: string) =>
    Array.from(new Set(norm(s).replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(t => t.length >= 3)));
const dice = (a: string, b: string) => {
    const A = tokens(a), B = tokens(b);
    if (!A.length || !B.length) return 0;
    const comunes = A.filter(t => B.includes(t)).length;
    return (2 * comunes) / (A.length + B.length);
};

export const AnalisisFacturaService = {
    // Con id_comp compara contra la orden de compra; con id_proveedor (Compra Directa, sin orden) busca cada
    // concepto del XML en el catálogo de artículos.
    analizar: async (params: { id_comp?: string; id_proveedor?: string; xml: Buffer; pdf?: Buffer | null }): Promise<AnalisisFactura> => {
        const { xml, pdf } = params;
        const esDirecta = !params.id_comp;
        const id_comp = params.id_comp ?? '00000000-0000-0000-0000-000000000000';
        const avisos: string[] = [];

        // ── 1) XML ────────────────────────────────────────────────────────────
        const cfdi = leerCfdi(xml.toString('utf8'));
        if (cfdi.tipoComprobante && cfdi.tipoComprobante !== 'I') {
            avisos.push(`El XML es de tipo "${cfdi.tipoComprobante}", no una factura de ingreso (I).`);
        }
        if (!cfdi.uuid) avisos.push('El XML no trae UUID (¿está timbrado?).');

        // ── 2) Orden de compra (o catálogo) y proveedor ──────────────────────
        // Compra directa sin proveedor elegido: se busca por el RFC del emisor del XML (sin guiones ni espacios)
        const rfcXml = cfdi.rfcEmisor.replace(/[^A-Z0-9&Ñ]/g, '');
        let porRfc: any[] = [];
        if (esDirecta && !params.id_proveedor) {
            if (!rfcXml) throw new Error('El XML no trae RFC del emisor: selecciona el proveedor a mano.');
            porRfc = await dbLocal.query<any>(
                `SELECT p.id_prove, p.rfc_prove, p.nomcort_prove
                   FROM proveedor p
                  WHERE upper(regexp_replace(coalesce(p.rfc_prove, ''), '[^A-Za-z0-9&Ñ]', '', 'g')) = :rfc
                  ORDER BY p.nomcort_prove
                  LIMIT 2`,
                { replacements: { rfc: rfcXml }, type: QueryTypes.SELECT }) as any[];
            if (porRfc.length === 0) {
                throw new Error(`No hay un proveedor con el RFC ${cfdi.rfcEmisor} (${cfdi.nombreEmisor || 'emisor del XML'}). Selecciónalo a mano.`);
            }
            if (porRfc.length > 1) {
                avisos.push(`Hay más de un proveedor con el RFC ${cfdi.rfcEmisor}; se tomó ${porRfc[0].nomcort_prove}. Verifica que sea el correcto.`);
            }
        }

        const [compra] = (esDirecta
            ? (porRfc.length
                ? porRfc
                : await dbLocal.query<any>(
                    `SELECT p.id_prove, p.rfc_prove, p.nomcort_prove FROM proveedor p WHERE p.id_prove = :id`,
                    { replacements: { id: params.id_proveedor ?? null }, type: QueryTypes.SELECT }))
            : await dbLocal.query<any>(
                `SELECT c.idprove_comp AS id_prove, p.rfc_prove, p.nomcort_prove
                   FROM compra_proveedor c LEFT JOIN proveedor p ON p.id_prove = c.idprove_comp
                  WHERE c.id_comp = :id_comp`,
                { replacements: { id_comp }, type: QueryTypes.SELECT })) as any[];
        if (!compra) throw new Error(esDirecta ? 'Selecciona primero el proveedor.' : 'Compra no encontrada.');

        const rfcProv = String(compra.rfc_prove ?? '').trim().toUpperCase();
        if (rfcProv && cfdi.rfcEmisor && rfcProv !== cfdi.rfcEmisor) {
            avisos.push(`El RFC del XML (${cfdi.rfcEmisor}) no es el del proveedor seleccionado (${rfcProv}).`);
        }

        // ¿Ya se capturó una factura con ese folio de este proveedor en otra compra?
        if (cfdi.folioCompleto) {
            const dup = await dbLocal.query<any>(
                `SELECT f.id_factura_proveedor, f.id_compra_prove_factura
                   FROM factura_compra_proveedor f
                   JOIN compra_proveedor c ON c.id_comp = f.id_compra_prove_factura
                  WHERE c.idprove_comp = :id_prove
                    AND trim(f.folio_factura_proveedor) = :folio
                    AND f.id_compra_prove_factura <> :id_comp
                  LIMIT 1`,
                { replacements: { id_prove: compra.id_prove, folio: cfdi.folioCompleto, id_comp }, type: QueryTypes.SELECT });
            if (dup.length) avisos.push(`El folio ${cfdi.folioCompleto} de este proveedor ya está capturado en otra compra.`);
        }

        interface LineaOrden {
            id_detcompsol: string; id_artic: string; des_artic: string; cod_barr: string; cod_int: string;
            cod_prove: string; cantidad_pedida: number; cantidad_pendiente: number; precio: number; usada: boolean;
        }
        let lineas: LineaOrden[] = [];

        if (!esDirecta) {
            const detalles = (await Detalle_Compra_SolicitadoRepository.getAllArticulosPorCompra(id_comp))
                .map((d: any) => (d.get ? d.get({ plain: true }) : d));

            // Códigos del proveedor para cada artículo (de su listado de precios)
            const codProvePorBarras = new Map<string, string>();
            try {
                const filas = await dbLocal.query<any>(
                    `SELECT trim(dlp.cod_barra_pro_detlist) AS cod, trim(dlp.cod_interno_articulo_prove_detlist) AS cod_prove
                       FROM detalle_listado_proveedor dlp
                       JOIN listados_proveedor lp ON lp.id_listprove = dlp.id_list_detlist
                      WHERE lp.id_prove_listprove = :id_prove
                        AND NULLIF(trim(dlp.cod_interno_articulo_prove_detlist), '') IS NOT NULL`,
                    { replacements: { id_prove: compra.id_prove }, type: QueryTypes.SELECT });
                for (const f of filas) codProvePorBarras.set(String(f.cod), String(f.cod_prove));
            } catch {
                // Aún no existe la columna: se sigue con código de barras / interno / descripción
            }

            lineas = detalles.map((d: any) => ({
                id_detcompsol: d.id_detcompsol,
                id_artic: d.idarticulo_detcompsol,
                des_artic: String(d.articulo?.des_artic ?? '').trim(),
                cod_barr: String(d.articulo?.cod_barr_artic ?? '').trim(),
                cod_int: d.articulo?.cod_int_artic !== undefined && d.articulo?.cod_int_artic !== null ? String(d.articulo.cod_int_artic) : '',
                cod_prove: codProvePorBarras.get(String(d.articulo?.cod_barr_artic ?? '').trim()) ?? '',
                cantidad_pedida: Number(d.cantidad_detcompsol) || 0,
                cantidad_pendiente: Number(d.cantidadPendiente ?? d.cantidad_detcompsol) || 0,
                precio: Number(d.precio_detcompsol) || 0,
                usada: false,
            }));
        } else {
            // Compra directa: no hay orden. Los candidatos salen del catálogo de artículos.
            const porId = new Map<string, LineaOrden>();
            const agrega = (f: any, codProve: string) => {
                const id = String(f.id_artic);
                const previo = porId.get(id);
                if (previo) { if (codProve && !previo.cod_prove) previo.cod_prove = codProve; return; }
                porId.set(id, {
                    id_detcompsol: '',
                    id_artic: id,
                    des_artic: String(f.des_artic ?? '').trim(),
                    cod_barr: String(f.cod_barr ?? '').trim(),
                    cod_int: f.cod_int !== null && f.cod_int !== undefined ? String(f.cod_int) : '',
                    cod_prove: codProve,
                    cantidad_pedida: 0,
                    cantidad_pendiente: 1e9,      // sin orden no hay "pendiente"
                    precio: 0,
                    usada: false,
                });
            };

            const codigos = Array.from(new Set(cfdi.conceptos.map(c => c.noIdentificacion.trim()).filter(Boolean)));
            if (codigos.length) {
                // Por código de barras o código interno
                const porCodigo = await dbLocal.query<any>(
                    `SELECT a.id_artic, trim(a.cod_barr_artic) AS cod_barr, a.cod_int_artic::text AS cod_int, a.des_artic
                       FROM articulo a
                      WHERE trim(a.cod_barr_artic) IN (:codigos) OR a.cod_int_artic::text IN (:codigos)`,
                    { replacements: { codigos }, type: QueryTypes.SELECT });
                for (const f of porCodigo) agrega(f, '');

                // Por el código que el proveedor tiene en su listado
                try {
                    const porProve = await dbLocal.query<any>(
                        `SELECT a.id_artic, trim(a.cod_barr_artic) AS cod_barr, a.cod_int_artic::text AS cod_int, a.des_artic,
                                trim(dlp.cod_interno_articulo_prove_detlist) AS cod_prove
                           FROM detalle_listado_proveedor dlp
                           JOIN listados_proveedor lp ON lp.id_listprove = dlp.id_list_detlist
                           JOIN articulo a ON trim(a.cod_barr_artic) = trim(dlp.cod_barra_pro_detlist)
                          WHERE lp.id_prove_listprove = :id_prove
                            AND trim(dlp.cod_interno_articulo_prove_detlist) IN (:codigos)`,
                        { replacements: { id_prove: compra.id_prove, codigos }, type: QueryTypes.SELECT });
                    for (const f of porProve) agrega(f, String(f.cod_prove));
                } catch {
                    // Aún no existe la columna del código del proveedor
                }
            }

            // Por descripción, solo para los conceptos que no se resolvieron por código
            const yaPorCodigo = (c: ConceptoCfdi) => c.noIdentificacion && Array.from(porId.values()).some(
                x => mismoCodigo(x.cod_prove, c.noIdentificacion) || mismoCodigo(x.cod_barr, c.noIdentificacion) || mismoCodigo(x.cod_int, c.noIdentificacion));
            for (const c of cfdi.conceptos) {
                if (yaPorCodigo(c)) continue;
                const toks = tokens(c.descripcion).sort((a, b) => b.length - a.length).slice(0, 3);
                if (toks.length < 2) continue;
                try {
                    const porDesc = await dbLocal.query<any>(
                        `SELECT a.id_artic, trim(a.cod_barr_artic) AS cod_barr, a.cod_int_artic::text AS cod_int, a.des_artic
                           FROM articulo a
                          WHERE upper(a.des_artic) LIKE ALL (ARRAY[:pats]) LIMIT 8`,
                        { replacements: { pats: toks.map(t => `%${t}%`) }, type: QueryTypes.SELECT });
                    for (const f of porDesc) agrega(f, '');
                } catch { /* sin candidatos por descripción */ }
            }
            lineas = Array.from(porId.values());
        }

        // ── 3) Cada concepto del XML contra la orden ─────────────────────────
        const buscar = (c: ConceptoCfdi): { l: LineaOrden; metodo: MetodoCoincidencia } | null => {
            const libres = lineas.filter(l => !l.usada);
            let l = c.noIdentificacion ? libres.find(x => mismoCodigo(x.cod_prove, c.noIdentificacion)) : undefined;
            if (l) return { l, metodo: 'CODIGO_PROVEEDOR' };
            l = c.noIdentificacion ? libres.find(x => mismoCodigo(x.cod_barr, c.noIdentificacion)) : undefined;
            if (l) return { l, metodo: 'CODIGO_BARRAS' };
            l = c.noIdentificacion ? libres.find(x => mismoCodigo(x.cod_int, c.noIdentificacion)) : undefined;
            if (l) return { l, metodo: 'CODIGO_INTERNO' };
            // Por descripción: solo si hay una coincidencia clara y única
            const puntuadas = libres
                .map(x => ({ x, s: dice(x.des_artic, c.descripcion) }))
                .filter(p => p.s >= 0.6)
                .sort((a, b) => b.s - a.s);
            if (puntuadas.length && (puntuadas.length === 1 || puntuadas[0].s - puntuadas[1].s >= 0.15)) {
                return { l: puntuadas[0].x, metodo: 'DESCRIPCION' };
            }
            return null;
        };

        const coincidencias = new Map<number, { l: LineaOrden; metodo: MetodoCoincidencia }>();
        for (const c of cfdi.conceptos) {
            const r = buscar(c);
            if (r) { if (!esDirecta) r.l.usada = true; coincidencias.set(c.indice, r); }
        }

        // ── 4) PDF: lotes y caducidades ──────────────────────────────────────
        let lotesPdf = new Map<number, ResultadoLotes>();
        let pdfAnalizado = false;
        let lineasPdfLeidas: string[] = [];
        const barrasDelPdf = new Map<number, string>();   // concepto → código de barras que se leyó en el PDF
        if (pdf && pdf.length > 0) {
            try {
                const lineasPdf = await leerLineasPdf(pdf);
                if (lineasPdf.length === 0) {
                    avisos.push('El PDF no trae texto (parece escaneado): los lotes se capturan a mano.');
                } else {
                    pdfAnalizado = true;
                    lineasPdfLeidas = lineasPdf;
                    lotesPdf = extraerLotes(lineasPdf, cfdi.conceptos.map(c => {
                        const m = coincidencias.get(c.indice);
                        return {
                            indice: c.indice,
                            codigos: [c.noIdentificacion, m?.l.cod_prove ?? '', m?.l.cod_barr ?? '', m?.l.cod_int ?? ''].filter(Boolean),
                            descripcion: c.descripcion,
                            cantidad: c.cantidad,
                            ignorar: [c.claveProdServ, c.claveUnidad, c.unidad].filter(Boolean),
                        };
                    }));
                }
            } catch (e: any) {
                avisos.push(`No se pudo leer el PDF (${e?.message ?? 'error'}): los lotes se capturan a mano.`);
            }
        }

        // ── 4b) Los que no se reconocieron por código: se intenta con el código de barras que trae el PDF ──
        // (hay facturas, como Difarmer, que en la misma columna ponen el código interno y el de barras, y el XML
        // solo trae el interno). En el PDF a veces el código sale cortado, por eso también se acepta por inicio.
        if (pdfAnalizado) {
            for (const c of cfdi.conceptos) {
                if (coincidencias.has(c.indice)) continue;
                const res = lotesPdf.get(c.indice);
                if (!res || res.indiceLinea === null) continue;
                // Los renglones muy largos son sellos / cadenas del SAT (base64): ahí salen números que no son códigos
                const cercanas = lineasPdfLeidas
                    .slice(Math.max(0, res.indiceLinea - 1), res.indiceLinea + 4)
                    .filter(l => l.length < 140)
                    .join(' ');
                const barras = Array.from(new Set(
                    (cercanas.match(/(?<![0-9])\d{8,14}(?![0-9])/g) ?? [])
                        .filter(x => x !== c.claveProdServ && x !== c.noIdentificacion),
                ));
                if (barras.length === 0) continue;

                if (!esDirecta) {
                    const libres = lineas.filter(l => !l.usada);
                    const hallada = libres.filter(l => l.cod_barr && barras.some(b => l.cod_barr === b || l.cod_barr.startsWith(b) || b.startsWith(l.cod_barr)));
                    if (hallada.length === 1) {
                        hallada[0].usada = true;
                        coincidencias.set(c.indice, { l: hallada[0], metodo: 'CODIGO_BARRAS' });
                        barrasDelPdf.set(c.indice, barras.find(b => hallada[0].cod_barr.startsWith(b) || b.startsWith(hallada[0].cod_barr) || hallada[0].cod_barr === b) ?? barras[0]);
                    }
                } else {
                    try {
                        const filas = await dbLocal.query<any>(
                            `SELECT a.id_artic, trim(a.cod_barr_artic) AS cod_barr, a.cod_int_artic::text AS cod_int, a.des_artic
                               FROM articulo a
                              WHERE trim(a.cod_barr_artic) IN (:barras)
                                 OR trim(a.cod_barr_artic) LIKE ANY (ARRAY[:likes])
                              LIMIT 6`,
                            { replacements: { barras, likes: barras.map(b => `${b}%`) }, type: QueryTypes.SELECT });
                        // Si hay varios, se queda con el que se parezca a la descripción de la factura
                        let elegido = filas.length === 1 ? filas[0] : null;
                        if (!elegido && filas.length > 1) {
                            const punt = filas.map((f: any) => ({ f, s: dice(String(f.des_artic ?? ''), c.descripcion) })).sort((a, b) => b.s - a.s);
                            if (punt[0].s >= 0.5 && punt[0].s - punt[1].s >= 0.15) elegido = punt[0].f;
                        }
                        if (elegido) {
                            const l: LineaOrden = {
                                id_detcompsol: '',
                                id_artic: String(elegido.id_artic),
                                des_artic: String(elegido.des_artic ?? '').trim(),
                                cod_barr: String(elegido.cod_barr ?? '').trim(),
                                cod_int: elegido.cod_int !== null && elegido.cod_int !== undefined ? String(elegido.cod_int) : '',
                                cod_prove: '',
                                cantidad_pedida: 0,
                                cantidad_pendiente: 1e9,
                                precio: 0,
                                usada: false,
                            };
                            coincidencias.set(c.indice, { l, metodo: 'CODIGO_BARRAS' });
                            barrasDelPdf.set(c.indice, barras.find(b => l.cod_barr.startsWith(b) || l.cod_barr === b) ?? barras[0]);
                        }
                    } catch { /* sin coincidencia por código de barras */ }
                }
            }
        }

        // ── 5) Resultado ─────────────────────────────────────────────────────
        const conceptos: ConceptoAnalizado[] = cfdi.conceptos.map(c => {
            const m = coincidencias.get(c.indice) ?? null;
            const pdfRes = lotesPdf.get(c.indice);
            const avisosC: string[] = [];

            if (!m) avisosC.push(esDirecta ? 'No está en el catálogo' : 'No está en la orden de compra');
            else if (!esDirecta) {
                if (c.cantidad > m.l.cantidad_pendiente) {
                    avisosC.push(`Viene ${c.cantidad} y solo hay ${m.l.cantidad_pendiente} pendiente en la orden`);
                }
                if (m.l.precio > 0 && Math.abs(c.valorUnitario - m.l.precio) > 0.005) {
                    avisosC.push(`Precio distinto: orden $${m.l.precio.toFixed(2)} · factura $${c.valorUnitario.toFixed(2)}`);
                }
                if (m.metodo === 'DESCRIPCION') avisosC.push('Coincidencia por descripción: verifica que sea el artículo');
            } else if (m.metodo === 'DESCRIPCION') {
                avisosC.push('Coincidencia por descripción: verifica que sea el artículo');
            }
            if (m && barrasDelPdf.has(c.indice)) {
                avisosC.push(`Reconocido por el código de barras del PDF (${barrasDelPdf.get(c.indice)})`);
            }
            if (pdfAnalizado) {
                if (!pdfRes?.encontradoEnPdf) avisosC.push('No encontrado en el PDF');
                else if (pdfRes.lotes.length === 0) avisosC.push('Lote no encontrado en el PDF');
                else if (pdfRes.cuadra === false) avisosC.push(`Los lotes del PDF suman ${pdfRes.sumaLotes} y la factura dice ${c.cantidad}`);
            }

            return {
                indice: c.indice,
                no_identificacion: c.noIdentificacion,
                descripcion: c.descripcion,
                cantidad_xml: c.cantidad,
                precio_xml: c.valorUnitario,
                descuento_pct: c.descuentoPct,
                iva_pct: c.ivaPct,
                importe_xml: c.importe,
                orden: m ? {
                    id_detcompsol: m.l.id_detcompsol,
                    id_artic: m.l.id_artic,
                    des_artic: m.l.des_artic,
                    cod_barr_artic: m.l.cod_barr,
                    cantidad_pedida: m.l.cantidad_pedida,
                    cantidad_pendiente: m.l.cantidad_pendiente,
                    precio_orden: m.l.precio,
                    metodo: m.metodo,
                } : null,
                pdf: {
                    analizado: pdfAnalizado,
                    encontrado: !!pdfRes?.encontradoEnPdf,
                    lotes: pdfRes?.lotes ?? [],
                    suma_lotes: pdfRes?.sumaLotes ?? 0,
                    cuadra: pdfRes?.cuadra ?? null,
                },
                avisos: avisosC,
            };
        });

        const pendientesSinXml = (esDirecta ? [] : lineas)
            .filter(l => !l.usada && l.cantidad_pendiente > 0)
            .map(l => ({
                id_detcompsol: l.id_detcompsol,
                des_artic: l.des_artic,
                cod_barr_artic: l.cod_barr,
                cantidad_pendiente: l.cantidad_pendiente,
            }));

        return {
            modo: esDirecta ? 'DIRECTA' : 'ORDEN',
            proveedor: { id_prove: String(compra.id_prove), nombre: String(compra.nomcort_prove ?? '').trim() },
            encabezado: {
                folio: cfdi.folioCompleto,
                fecha: cfdi.fecha,
                uuid: cfdi.uuid,
                total: cfdi.total,
                subtotal: cfdi.subtotal,
                moneda: cfdi.moneda,
                rfc_emisor: cfdi.rfcEmisor,
                nombre_emisor: cfdi.nombreEmisor,
                tipo_comprobante: cfdi.tipoComprobante,
            },
            avisos,
            conceptos,
            pendientes_sin_xml: pendientesSinXml,
            resumen: {
                conceptos: conceptos.length,
                en_orden: conceptos.filter(c => c.orden).length,
                sin_orden: conceptos.filter(c => !c.orden).length,
                con_lotes: conceptos.filter(c => c.pdf.lotes.length > 0).length,
                sin_lotes_en_pdf: conceptos.filter(c => c.orden && c.pdf.lotes.length === 0).length,
                lotes_no_cuadran: conceptos.filter(c => c.pdf.cuadra === false).length,
            },
        };
    },
};
