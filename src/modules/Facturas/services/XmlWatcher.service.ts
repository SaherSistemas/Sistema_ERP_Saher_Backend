import fs from 'fs';
import path from 'path';
import Facturas from '../model/Facturas.model';
import EmpresaSucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { parseCfdiXml, generarPdfDesdeCfdi, PdfExtras } from '../helpers/cfdi-xml-to-pdf.helper';
import { RUTA_PDFS } from '../helpers/pdf.helper';

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

async function procesarXml(xmlPath: string) {
    const filename = path.basename(xmlPath);
    if (PROCESADOS.has(filename)) return;
    PROCESADOS.add(filename);

    console.log(`[XmlWatcher] Procesando: ${filename}`);

    let xmlContent: string;
    try {
        xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    } catch (err: any) {
        console.error(`[XmlWatcher] No se pudo leer ${filename}:`, err.message);
        PROCESADOS.delete(filename);
        return;
    }

    let cfdi: ReturnType<typeof parseCfdiXml>;
    try {
        cfdi = parseCfdiXml(xmlContent);
    } catch (err: any) {
        console.error(`[XmlWatcher] XML inválido ${filename}:`, err.message);
        return;
    }

    // El nombre del archivo viene como: FSH_37046_RFC_EMPRESA_RFC_CLIENTE.xml
    // Extraemos Serie y Folio del nombre para buscar la factura con mayor precisión
    const sinExt = filename.replace(/\.xml$/i, '');
    const partes = sinExt.split('_');
    // partes[0]=Serie  partes[1]=Folio  partes[2]=RFC_Empresa  partes[3]=RFC_Cliente
    const serieNombre = partes[0] ?? cfdi.serie;
    const folioNombre = partes[1] ?? cfdi.folio;

    const candidatos = [
        `${serieNombre}${folioNombre}`,   // "FSH37046"
        folioNombre,                       // "37046"
        `${cfdi.serie}${cfdi.folio}`,     // del XML
        cfdi.folio,
    ];

    let factura: Facturas | null = null;
    for (const candidato of candidatos) {
        factura = await Facturas.findOne({ where: { folio_factura: candidato, estatus_factura: 'PEN' } });
        if (factura) break;
    }

    // Si ya está timbrada con este UUID, ignorar
    if (!factura) {
        const yaExiste = await Facturas.findOne({ where: { uuid_sat: cfdi.uuid } });
        if (yaExiste) {
            console.log(`[XmlWatcher] UUID ${cfdi.uuid} ya registrado, se omite.`);
            moverAProcesados(xmlPath);
            return;
        }
        console.warn(`[XmlWatcher] No se encontró factura PEN para folio "${candidatos.join('" ni "')}"`);;
        return;
    }

    // Guardar XML en carpeta de facturas
    if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
    const xmlDest = path.join(RUTA_PDFS, `${cfdi.serie}${cfdi.folio}_${cfdi.uuid}.xml`);
    fs.copyFileSync(xmlPath, xmlDest);

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
        await generarPdfDesdeCfdi(cfdi, pdfPath, logoPath, extras);
    } catch (pdfErr: any) {
        console.error(`[XmlWatcher] Error generando PDF para ${cfdi.uuid}:`, pdfErr.message);
        return;
    }

    // Actualizar factura en BD
    await factura.update({
        uuid_sat: cfdi.uuid,
        fecha_timbrado: new Date(cfdi.fechaTimbrado),
        estatus_factura: 'TIM',
        id_forma_pago: cfdi.formaPago || factura.id_forma_pago,
        id_metodo_pago: cfdi.metodoPago || factura.id_metodo_pago,
        uso_cfdi: cfdi.receptor.usoCFDI || factura.uso_cfdi,
        pdf_url: pdfPath,
        xml_url: xmlDest,
    });

    console.log(`[XmlWatcher] ✓ Factura ${factura.id_factura} timbrada. UUID=${cfdi.uuid}`);
    moverAProcesados(xmlPath);
}

function moverAProcesados(xmlPath: string) {
    try {
        const procesadosDir = path.join(path.dirname(xmlPath), 'procesados');
        if (!fs.existsSync(procesadosDir)) fs.mkdirSync(procesadosDir, { recursive: true });
        const dest = path.join(procesadosDir, path.basename(xmlPath));
        fs.renameSync(xmlPath, dest);
    } catch (err: any) {
        console.warn('[XmlWatcher] No se pudo mover XML a procesados:', err.message);
    }
}

export function iniciarXmlWatcher() {
    const carpeta = process.env.RUTA_XML_ENTRADA;
    if (!carpeta) {
        console.warn('[XmlWatcher] RUTA_XML_ENTRADA no configurada, watcher inactivo.');
        return;
    }

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, { recursive: true });
        console.log(`[XmlWatcher] Carpeta creada: ${carpeta}`);
    }

    console.log(`[XmlWatcher] Vigilando: ${carpeta} (cada ${POLL_MS / 1000}s)`);

    setInterval(async () => {
        let archivos: string[];
        try {
            archivos = fs.readdirSync(carpeta).filter(f => f.toLowerCase().endsWith('.xml'));
        } catch {
            return;
        }
        for (const archivo of archivos) {
            await procesarXml(path.join(carpeta, archivo));
        }
    }, POLL_MS);
}
