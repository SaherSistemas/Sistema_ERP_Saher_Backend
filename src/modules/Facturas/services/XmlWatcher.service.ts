import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import Facturas from '../model/Facturas.model';
import FacturaPagoCFDI from '../model/Factura_Pago_CFDI.model';
import EmpresaSucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import { Op, QueryTypes } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { parseCfdiXml, generarPdfDesdeCfdi, PdfExtras } from '../helpers/cfdi-xml-to-pdf.helper';
import { RUTA_PDFS } from '../helpers/pdf.helper';
import { ImpresoraRepository } from '../../Impresiones/repositories/ImpresoraRepository';
import { TrabajoImpresionRepository } from '../../Impresiones/repositories/TrabajoImpresionRepository';

const POLL_MS = 3000;
const PROCESADOS = new Set<string>();

async function getDomicilio(calle: string | null, id_colonia: string | null): Promise<string> {
    const partes: string[] = [];
    if (calle) partes.push(calle);
    if (id_colonia) {
        const rows = await dbLocal.query<{ nom_colonia: string; cp_colonia: string; nom_ciuda: string }>(
            `SELECT co.nom_colonia, co.cp_colonia, ci.nom_ciuda
             FROM colonia co
             LEFT JOIN ciudad ci ON ci.id_ciuda = co.id_ciuda_colonia
             WHERE co.id_colonia = :id`,
            { replacements: { id: id_colonia }, type: QueryTypes.SELECT }
        );
        const col = rows[0];
        if (col?.nom_colonia) partes.push(`Col. ${col.nom_colonia}`);
        if (col?.cp_colonia)  partes.push(`CP ${col.cp_colonia}`);
        if (col?.nom_ciuda)   partes.push(col.nom_ciuda);
    }
    return partes.join(', ');
}

// ─── Complemento de Pago (TipoDeComprobante="P") ──────────────────────────────
async function procesarXmlPago(xmlPath: string, xmlContent: string) {
    const filename = path.basename(xmlPath);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(xmlContent);

    const comp = doc['cfdi:Comprobante'] ?? doc['Comprobante'];
    if (!comp) return;

    const tfd   = comp['cfdi:Complemento']?.['tfd:TimbreFiscalDigital'];
    const uuid  = tfd?.['@_UUID'] as string | undefined;
    const fecha = tfd?.['@_FechaTimbrado'] as string | undefined;
    const folioComp = comp['@_Folio'] as string | undefined; // folio PROPIO de este complemento de pago

    if (!uuid) {
        console.warn(`[XmlWatcher][Pago] Sin UUID en ${filename}`);
        return;
    }

    // Extraer UUIDs de documentos relacionados del complemento pago20
    const pagosNode = comp['cfdi:Complemento']?.['pago20:Pagos']
                   ?? comp['cfdi:Complemento']?.['pago10:Pagos'];
    const pagoArr   = pagosNode?.['pago20:Pago'] ?? pagosNode?.['pago10:Pago'];
    const pagos     = Array.isArray(pagoArr) ? pagoArr : pagoArr ? [pagoArr] : [];

    const uuidsRelacionados: string[] = [];
    for (const pago of pagos) {
        const docArr = pago['pago20:DoctoRelacionado'] ?? pago['pago10:DoctoRelacionado'];
        const docs   = Array.isArray(docArr) ? docArr : docArr ? [docArr] : [];
        for (const d of docs) {
            const id = d['@_IdDocumento'] as string | undefined;
            if (id) uuidsRelacionados.push(id.toUpperCase());
        }
    }

    if (!uuidsRelacionados.length) {
        console.warn(`[XmlWatcher][Pago] Sin documentos relacionados en ${filename}`);
        return;
    }

    // Buscar FacturaPagoCFDI pendiente que coincida con alguno de esos UUIDs.
    // Comparación case-insensitive: el XML trae los UUID en mayúsculas pero en
    // esta base quedaron guardados en minúsculas — con Op.in (sensible a
    // mayúsculas) esto nunca hacía match y ningún pago se marcaba TIM jamás.
    const cfdis = await FacturaPagoCFDI.findAll({
        where: {
            [Op.and]: [
                { estatus_timbrado: { [Op.in]: ['PEN', 'ERR'] } },
                dbLocal.where(dbLocal.fn('upper', dbLocal.col('uuid_relacionado')), { [Op.in]: uuidsRelacionados }),
            ],
        },
    });

    if (!cfdis.length) {
        console.log(`[XmlWatcher][Pago] No hay CFDIs PEN/ERR para UUIDs: ${uuidsRelacionados.join(', ')}`);
        return;
    }

    // Guardar XML en carpeta de PDFs
    try { await fs.access(RUTA_PDFS); } catch { await fs.mkdir(RUTA_PDFS, { recursive: true }); }
    const xmlDest = path.join(RUTA_PDFS, `Pago_${uuid}.xml`);
    await fs.copyFile(xmlPath, xmlDest);

    // Actualizar todos los CFDIs del grupo a TIM
    for (const cfdi of cfdis) {
        await cfdi.update({
            uuid_cfdi_pago:   uuid,
            fecha_timbrado:   fecha ? new Date(fecha) : new Date(),
            estatus_timbrado: 'TIM',
            xml_url:          xmlDest,
        } as any);
        console.log(`[XmlWatcher][Pago] ✓ FacturaPagoCFDI ${cfdi.id_pago_cfdi} → TIM. UUID=${uuid}`);
    }

    // Registrar el UUID también en la fila "P" (wrapper) de `facturas` — antes
    // nunca se tocaba y se quedaba con uuid_sat en null para siempre. Se ubica
    // por su folio propio (el <cfdi:Comprobante Folio="..."> de este mismo XML),
    // igual que procesarXml() ya hace para las facturas tipo I/E.
    if (folioComp) {
        const facturaP = await Facturas.findOne({
            where: { tipo_cfdi: 'P', folio_factura: String(folioComp), uuid_sat: null },
        });
        if (facturaP) {
            await facturaP.update({
                uuid_sat:        uuid,
                fecha_timbrado:  fecha ? new Date(fecha) : new Date(),
                estatus_factura: 'TIM',
                xml_url:         xmlDest,
            } as any);
            console.log(`[XmlWatcher][Pago] ✓ Factura P ${facturaP.id_factura} (folio ${folioComp}) → uuid_sat=${uuid}`);
        } else {
            console.warn(`[XmlWatcher][Pago] No se encontró la fila P con folio ${folioComp} (o ya tenía uuid_sat) para registrar el UUID.`);
        }
    }
}

// ─── Factura de Ingreso/Egreso ────────────────────────────────────────────────
async function procesarXml(xmlPath: string) {
    const filename = path.basename(xmlPath);
    if (PROCESADOS.has(filename)) return;

    // Leer XML primero para detectar tipo
    let xmlContent: string;
    try {
        xmlContent = await fs.readFile(xmlPath, 'utf-8');
    } catch (err: any) {
        console.error(`[XmlWatcher] No se pudo leer ${filename}:`, err.message);
        return;
    }

    // Detectar TipoDeComprobante
    const tipoMatch = xmlContent.match(/TipoDeComprobante\s*=\s*["']([^"']+)["']/i);
    const tipo = tipoMatch?.[1] ?? '';

    if (tipo === 'P') {
        PROCESADOS.add(filename);
        await procesarXmlPago(xmlPath, xmlContent);
        return;
    }

    // Pre-filtro por nombre de archivo antes de leer el XML
    const sinExt      = filename.replace(/\.xml$/i, '');
    const partes      = sinExt.split('_');
    const serieNombre = partes[0] ?? '';
    const folioNombre = partes[1] ?? '';

    const candidatosPrevios = [
        `${serieNombre}${folioNombre}`,
        folioNombre,
    ].filter(Boolean);

    let factura: Facturas | null = null;
    for (const c of candidatosPrevios) {
        factura = await Facturas.findOne({
            where: { folio_factura: c, uuid_sat: null },
        });
        if (factura) break;
    }

    if (!factura) {
        PROCESADOS.add(filename);
        return;
    }

    PROCESADOS.add(filename);
    console.log(`[XmlWatcher] Procesando: ${filename}`);

    let cfdi: ReturnType<typeof parseCfdiXml>;
    try {
        cfdi = parseCfdiXml(xmlContent);
    } catch (err: any) {
        console.error(`[XmlWatcher] XML inválido ${filename}:`, err.message);
        return;
    }

    // Refinar búsqueda con datos reales del XML
    if (factura.folio_factura !== `${cfdi.serie}${cfdi.folio}` && factura.folio_factura !== cfdi.folio) {
        const candidatosXml = [`${cfdi.serie}${cfdi.folio}`, cfdi.folio];
        let facturaXml: Facturas | null = null;
        for (const c of candidatosXml) {
            facturaXml = await Facturas.findOne({ where: { folio_factura: c, uuid_sat: null } });
            if (facturaXml) break;
        }
        if (facturaXml) factura = facturaXml;
    }

    // Si el UUID ya está registrado, mover y salir
    const yaExiste = await Facturas.findOne({ where: { uuid_sat: cfdi.uuid } });
    if (yaExiste) {
        console.log(`[XmlWatcher] UUID ${cfdi.uuid} ya registrado, se omite.`);
        return;
    }

    // Guardar XML en carpeta de facturas
    try { await fs.access(RUTA_PDFS); } catch { await fs.mkdir(RUTA_PDFS, { recursive: true }); }
    const xmlDest = path.join(RUTA_PDFS, `${cfdi.serie}${cfdi.folio}_${cfdi.uuid}.xml`);
    await fs.copyFile(xmlPath, xmlDest);

    // Cargar domicilios para el PDF
    const extras: PdfExtras = {};
    if (factura.id_empresa_facturas) {
        const empresa = await EmpresaSucursal.findByPk(factura.id_empresa_facturas);
        if (empresa) {
            extras.emisorDomicilio = await getDomicilio(
                (empresa as any).calle_empre,
                (empresa as any).id_colonia_empre ?? null
            );
        }
    }
    if (factura.id_pedido_alm) {
        const ped = await Pedido_Almacen.findByPk(factura.id_pedido_alm, { attributes: ['cod_int_pedido_alm'] });
        if (ped?.cod_int_pedido_alm) extras.pedido = ped.cod_int_pedido_alm;
    }
    if (factura.id_cliente_alm) {
        const cliente = await Cliente_Almacen.findByPk(factura.id_cliente_alm);
        if (cliente) {
            extras.receptorDomicilio    = await getDomicilio(
                (cliente as any).calle_cliente_alm,
                (cliente as any).id_colonia_cliente_alm ?? null
            );
            extras.receptorNomComercial = (cliente as any).nom_corto_cliente_alm ?? undefined;
            extras.direccionEntrega     = (cliente as any).direccion_entrega_cliente_alm ?? undefined;
        }
    }

    // Generar PDF
    const pdfPath = path.join(RUTA_PDFS, `${cfdi.serie}${cfdi.folio}_${cfdi.uuid}.pdf`);
    const logoPath = process.env.LOGO_EMPRESA_PATH ?? undefined;
    try {
        // El PDF de toda factura lleva, por default, la clave del SAT y la clave de unidad SAT por renglón
        await generarPdfDesdeCfdi(cfdi, pdfPath, logoPath, extras, 'detalle_sat');
    } catch (pdfErr: any) {
        console.error(`[XmlWatcher] Error generando PDF para ${cfdi.uuid}:`, pdfErr.message);
        return;
    }

    // Actualizar factura en BD
    await factura.update({
        uuid_sat:        cfdi.uuid,
        fecha_timbrado:  new Date(cfdi.fechaTimbrado),
        estatus_factura: 'TIM',
        id_forma_pago:   cfdi.formaPago   || factura.id_forma_pago,
        id_metodo_pago:  cfdi.metodoPago  || factura.id_metodo_pago,
        uso_cfdi:        cfdi.receptor.usoCFDI || factura.uso_cfdi,
        pdf_url:         pdfPath,
        xml_url:         xmlDest,
    });

    console.log(`[XmlWatcher] ✓ Factura ${factura.id_factura} timbrada. UUID=${cfdi.uuid}`);
    // El XML se deja en su carpeta original — PROCESADOS evita reprocesarlo en esta sesión

    // Crear trabajo de impresión para la factura timbrada
    if (factura.id_empresa_facturas) {
        try {
            const id_impresora = await ImpresoraRepository.getImpresora(factura.id_empresa_facturas, 'PRINCIPAL');
            await TrabajoImpresionRepository.create({
                cod_interno_pedido: factura.folio_factura ?? cfdi.folio,
                tipo_documento: 'FACTURA',
                id_impresora,
                payload: {
                    tipo: 'pdf',
                    ruta_archivo: pdfPath,
                },
            });
            console.log(`[XmlWatcher] Trabajo de impresión creado para ${factura.folio_factura}`);
        } catch (impErr: any) {
            console.warn(`[XmlWatcher] No se pudo crear trabajo de impresión: ${impErr.message}`);
        }
    }
}


export function iniciarXmlWatcher() {
    const carpeta = process.env.RUTA_XML_ENTRADA;
    if (!carpeta) {
        console.warn('[XmlWatcher] RUTA_XML_ENTRADA no configurada, watcher inactivo.');
        return;
    }

    if (!existsSync(carpeta)) {
        mkdirSync(carpeta, { recursive: true });
        console.log(`[XmlWatcher] Carpeta creada: ${carpeta}`);
    }

    console.log(`[XmlWatcher] Vigilando: ${carpeta} (cada ${POLL_MS / 1000}s)`);

    let corriendo = false;

    setInterval(async () => {
        if (corriendo) return;
        corriendo = true;
        try {
            const hace48h = Date.now() - 12 * 60 * 60 * 1000;
            let todos: string[];
            try {
                todos = await fs.readdir(carpeta);
            } catch {
                return;
            }

            // Filtrar primero los que ya fueron procesados (sin I/O de red)
            const candidatos = todos.filter(f =>
                f.toLowerCase().endsWith('.xml') && !PROCESADOS.has(f)
            );

            // De los candidatos, solo los modificados en las últimas 48h
            // Batches de 50 para no saturar el share SMB
            const xmlsRecientes: string[] = [];
            for (let i = 0; i < candidatos.length; i += 50) {
                const batch = candidatos.slice(i, i + 50);
                const results = await Promise.all(
                    batch.map(async f => {
                        try {
                            const stat = await fs.stat(path.join(carpeta, f));
                            return stat.mtimeMs >= hace48h ? f : null;
                        } catch {
                            return null;
                        }
                    })
                );
                for (const r of results) if (r) xmlsRecientes.push(r);
            }

            for (const archivo of xmlsRecientes) {
                await procesarXml(path.join(carpeta, archivo));
            }
        } finally {
            corriendo = false;
        }
    }, POLL_MS);
}
