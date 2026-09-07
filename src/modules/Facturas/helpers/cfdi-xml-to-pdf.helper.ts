import { XMLParser } from 'fast-xml-parser';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CfdiParseResult {
    uuid: string;
    serie: string;
    folio: string;
    fecha: string;
    fechaTimbrado: string;
    formaPago: string;
    metodoPago: string;
    condicionesDePago: string;
    moneda: string;
    subTotal: number;
    total: number;
    lugarExpedicion: string;
    noCertificado: string;
    sello: string;
    selloCFD: string;
    selloSAT: string;
    noCertSAT: string;
    rfcProvCertif: string;
    emisor: { rfc: string; nombre: string; regimenFiscal: string };
    receptor: { rfc: string; nombre: string; domicilioFiscal: string; regimenFiscal: string; usoCFDI: string };
    conceptos: ConceptoCfdi[];
    totalImpuestosTrasladados: number;
}

export interface ConceptoCfdi {
    claveProdServ: string;
    noIdentificacion: string;
    cantidad: number;
    claveUnidad: string;
    unidad: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    ivaImporte: number;
    ivaBase: number;
    tasaIva: number;
    // parsed from Descripcion
    lote: string;
    fechaCad: string;
    pzas: string;
    descripcionLimpia: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseCfdiXml(xmlContent: string): CfdiParseResult {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(xmlContent);

    const comp = doc['cfdi:Comprobante'];
    if (!comp) throw new Error('XML no es un CFDI válido (sin cfdi:Comprobante)');

    const emisorRaw = comp['cfdi:Emisor'];
    const receptorRaw = comp['cfdi:Receptor'];
    const tfd = comp['cfdi:Complemento']?.['tfd:TimbreFiscalDigital'];

    // Conceptos — puede ser array o un solo objeto
    const conceptosRaw = comp['cfdi:Conceptos']?.['cfdi:Concepto'];
    const conceptosArr = Array.isArray(conceptosRaw) ? conceptosRaw : [conceptosRaw].filter(Boolean);

    const conceptos: ConceptoCfdi[] = conceptosArr.map((c: any) => {
        const traslados = c['cfdi:Impuestos']?.['cfdi:Traslados']?.['cfdi:Traslado'];
        const trasladoArr = Array.isArray(traslados) ? traslados : [traslados].filter(Boolean);
        const iva = trasladoArr.find((t: any) => t['@_Impuesto'] === '002');

        // Descripcion format: "NOMBRE DEL PRODUCTO - Lote:XXX Fec/Cad: MM/YYYY Pzas: N.NNNN XX.XX%"
        const desc: string = c['@_Descripcion'] ?? '';
        const loteMatch = desc.match(/Lote[:\s]*([\w-]+)/i);
        const cadMatch = desc.match(/Fec\/Cad[:\s]*([\d\/]+)/i);
        const pzsMatch = desc.match(/Pzas[:\s]*([\d.,]+)/i);
        const separatorIdx = desc.indexOf(' - Lote');
        const descripcionLimpia = separatorIdx > -1 ? desc.substring(0, separatorIdx).trim() : desc;

        return {
            claveProdServ:    c['@_ClaveProdServ']     ?? '',
            noIdentificacion: c['@_NoIdentificacion']  ?? '',
            cantidad: Number(c['@_Cantidad']) || 0,
            claveUnidad: c['@_ClaveUnidad'] ?? '',
            unidad: c['@_Unidad'] ?? '',
            descripcion: desc,
            descripcionLimpia,
            valorUnitario: Number(c['@_ValorUnitario']) || 0,
            importe: Number(c['@_Importe']) || 0,
            ivaBase: Number(iva?.['@_Base']) || Number(c['@_Importe']) || 0,
            ivaImporte: Number(iva?.['@_Importe']) || 0,
            tasaIva: Number(iva?.['@_TasaOCuota']) || 0,
            lote: loteMatch?.[1] ?? '',
            fechaCad: cadMatch?.[1] ?? '',
            pzas: pzsMatch?.[1] ?? '',
        };
    });

    const condiciones: string = comp['@_CondicionesDePago'] ?? '';

    return {
        uuid: tfd?.['@_UUID'] ?? '',
        serie: comp['@_Serie'] ?? '',
        folio: comp['@_Folio'] ?? '',
        fecha: comp['@_Fecha'] ?? '',
        fechaTimbrado: tfd?.['@_FechaTimbrado'] ?? '',
        formaPago: comp['@_FormaPago'] ?? '',
        metodoPago: comp['@_MetodoPago'] ?? '',
        condicionesDePago: condiciones,
        moneda: comp['@_Moneda'] ?? 'MXN',
        subTotal: Number(comp['@_SubTotal']) || 0,
        total: Number(comp['@_Total']) || 0,
        lugarExpedicion: comp['@_LugarExpedicion'] ?? '',
        noCertificado: comp['@_NoCertificado'] ?? '',
        sello: comp['@_Sello'] ?? '',
        selloCFD: tfd?.['@_SelloCFD'] ?? '',
        selloSAT: tfd?.['@_SelloSAT'] ?? '',
        noCertSAT: tfd?.['@_NoCertificadoSAT'] ?? '',
        rfcProvCertif: tfd?.['@_RfcProvCertif'] ?? '',
        emisor: {
            rfc: emisorRaw?.['@_Rfc'] ?? '',
            nombre: emisorRaw?.['@_Nombre'] ?? '',
            regimenFiscal: emisorRaw?.['@_RegimenFiscal'] ?? '',
        },
        receptor: {
            rfc: receptorRaw?.['@_Rfc'] ?? '',
            nombre: receptorRaw?.['@_Nombre'] ?? '',
            domicilioFiscal: receptorRaw?.['@_DomicilioFiscalReceptor'] ?? '',
            regimenFiscal: receptorRaw?.['@_RegimenFiscalReceptor'] ?? '',
            usoCFDI: receptorRaw?.['@_UsoCFDI'] ?? '',
        },
        conceptos,
        totalImpuestosTrasladados: Number(comp['cfdi:Impuestos']?.['@_TotalImpuestosTrasladados']) || 0,
    };
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmt2(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function numToWords(n: number): string {
    if (n === 0) return 'CERO';
    if (n < 0) return 'MENOS ' + numToWords(-n);
    if (n < 30) return UNIDADES[n];
    if (n < 100) {
        const d = Math.floor(n / 10), u = n % 10;
        return u === 0 ? DECENAS[d] : DECENAS[d] + ' Y ' + UNIDADES[u];
    }
    if (n === 100) return 'CIEN';
    if (n < 1000) {
        const c = Math.floor(n / 100), r = n % 100;
        return CENTENAS[c] + (r > 0 ? ' ' + numToWords(r) : '');
    }
    if (n < 2000) return 'MIL' + (n % 1000 > 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 1000000) {
        const m = Math.floor(n / 1000), r = n % 1000;
        return numToWords(m) + ' MIL' + (r > 0 ? ' ' + numToWords(r) : '');
    }
    const m = Math.floor(n / 1000000), r = n % 1000000;
    return numToWords(m) + (m === 1 ? ' MILLÓN' : ' MILLONES') + (r > 0 ? ' ' + numToWords(r) : '');
}

function importeEnLetra(total: number, moneda = 'MXN'): string {
    const entero = Math.floor(total);
    const centavos = Math.round((total - entero) * 100);
    const monedaLabel = moneda === 'MXN' ? 'PESOS' : moneda;
    return `${numToWords(entero)} ${monedaLabel} ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

function urlVerificacion(cfdi: CfdiParseResult): string {
    const selloEnd = cfdi.selloCFD.slice(-8);
    return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${cfdi.uuid}&re=${cfdi.emisor.rfc}&rr=${cfdi.receptor.rfc}&tt=${cfdi.total.toFixed(6)}&fe=${selloEnd}`;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const PAGE_W = 612;  // Letter width in pts
const PAGE_H = 792;  // Letter height in pts
const ML = 36;       // Margin left
const MR = 36;       // Margin right
const MT = 36;       // Margin top
const CONTENT_W = PAGE_W - ML - MR;

// ─── PDF Generator ────────────────────────────────────────────────────────────

export interface PdfExtras {
    emisorDomicilio?: string;      // calle + colonia + CP + ciudad
    receptorDomicilio?: string;    // calle + colonia + CP + ciudad
    receptorNomComercial?: string;
    direccionEntrega?: string;
}

export async function generarPdfDesdeCfdi(
    cfdi: CfdiParseResult,
    outPath: string,
    logoPath?: string,
    extras?: PdfExtras,
): Promise<string> {

    const qrUrl = urlVerificacion(cfdi);
    const qrBuf = await QRCode.toBuffer(qrUrl, { type: 'png', width: 100, margin: 1, errorCorrectionLevel: 'M' });

    // Parse pedido & agente from condicionesDePago
    const pedidoMatch = cfdi.condicionesDePago.match(/Numero de Pedido[:\s]*([\w_]+)/i);
    const agenteMatch = cfdi.condicionesDePago.match(/Agente[:\s]*(.+)/i);
    const pedido = pedidoMatch?.[1] ?? '';
    const agente = agenteMatch?.[1]?.trim() ?? '';

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, bufferPages: true });
        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);

        // ── Tracking state ─────────────────────────────────────────────────
        let pageNum = 0;
        let curY = 0;

        function addPage() {
            pageNum++;
            doc.addPage({ size: 'LETTER', margin: 0 });
            curY = MT;
        }

        function drawMiniHeader() {
            const y = curY;
            const col1 = ML;
            const col2 = ML + CONTENT_W * 0.55;
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
            doc.text(`UUID: ${cfdi.uuid}`, col1, y, { width: CONTENT_W * 0.52 });
            doc.font('Helvetica').fontSize(7);
            doc.text(`Folio: ${cfdi.serie}${cfdi.folio}   Pedido: ${pedido}   Agente: ${agente}`, col2, y);
            curY += 14;
            doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(0.5).strokeColor('#aaa').stroke();
            curY += 6;
        }

        // ────────────────────────────────────────────────────────────────────
        // PAGE 1 — Encabezado completo
        // ────────────────────────────────────────────────────────────────────
        addPage();

        // Logo area (left half) or company text block
        const headerH = 90;
        const leftW = CONTENT_W * 0.55;
        const rightX = ML + leftW + 10;
        const rightW = CONTENT_W - leftW - 10;

        // Company info (left)
        let ly = MT;
        if (logoPath && fs.existsSync(logoPath)) {
            doc.image(logoPath, ML, ly, { height: 50, fit: [140, 50] });
            ly += 55;
        }
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
        doc.text(cfdi.emisor.nombre, ML, ly, { width: leftW });
        ly += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#333');
        doc.text(`RFC: ${cfdi.emisor.rfc}`, ML, ly, { width: leftW });
        ly += 10;
        doc.text(`Régimen Fiscal: ${cfdi.emisor.regimenFiscal}`, ML, ly, { width: leftW });
        ly += 10;
        if (extras?.emisorDomicilio) {
            doc.text(extras.emisorDomicilio, ML, ly, { width: leftW });
            ly += 10;
        } else {
            doc.text(`Lugar de Expedición: ${cfdi.lugarExpedicion}`, ML, ly, { width: leftW });
            ly += 10;
        }

        // Metadata table (right)
        const metaRows = [
            ['Tipo de comprobante', 'Ingreso'],
            ['Serie - Folio', `${cfdi.serie} - ${cfdi.folio}`],
            ['Fecha emisión', cfdi.fecha.replace('T', ' ')],
            ['Fecha timbrado', cfdi.fechaTimbrado.replace('T', ' ')],
            ['Forma de pago', cfdi.formaPago],
            ['Método de pago', cfdi.metodoPago],
            ['Moneda', cfdi.moneda],
            ['No. Certificado', cfdi.noCertificado.slice(-8)],
        ];

        let ry = MT;
        const cellH = 11;
        metaRows.forEach(([label, value]) => {
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
            doc.text(label + ':', rightX, ry, { width: 90 });
            doc.font('Helvetica').fontSize(7).fillColor('#000');
            doc.text(value, rightX + 92, ry, { width: rightW - 92 });
            ry += cellH;
        });

        // UUID box
        ry += 4;
        doc.rect(rightX, ry, rightW, 18).lineWidth(0.5).strokeColor('#888').stroke();
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#555');
        doc.text('Folio Fiscal (UUID):', rightX + 3, ry + 3);
        doc.font('Helvetica').fontSize(6).fillColor('#000');
        doc.text(cfdi.uuid, rightX + 3, ry + 10, { width: rightW - 6 });
        ry += 22;

        curY = Math.max(ly, ry) + 8;

        // Separator
        doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(0.8).strokeColor('#000').stroke();
        curY += 8;

        // Receptor info
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#333');
        doc.text('DATOS DEL RECEPTOR', ML, curY);
        curY += 10;

        const rxCol = CONTENT_W / 3;

        // Fila 1: Razón Social | RFC | Uso CFDI
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
        doc.text('Razón Social:', ML, curY);
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text(cfdi.receptor.nombre, ML + 65, curY, { width: rxCol - 70 });

        doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
        doc.text('RFC:', ML + rxCol, curY);
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text(cfdi.receptor.rfc, ML + rxCol + 25, curY);

        doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
        doc.text('Uso CFDI:', ML + rxCol * 2, curY);
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text(cfdi.receptor.usoCFDI, ML + rxCol * 2 + 45, curY);
        curY += 10;

        // Fila 2: Nom. Comercial (si existe) | Dom. Fiscal CP
        if (extras?.receptorNomComercial) {
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
            doc.text('Nom. Comercial:', ML, curY);
            doc.font('Helvetica').fontSize(7).fillColor('#000');
            doc.text(extras.receptorNomComercial, ML + 72, curY, { width: rxCol * 2 - 72 });

            doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
            doc.text('CP Fiscal:', ML + rxCol * 2, curY);
            doc.font('Helvetica').fontSize(7).fillColor('#000');
            doc.text(cfdi.receptor.domicilioFiscal, ML + rxCol * 2 + 45, curY);
            curY += 10;
        }

        // Fila 3: Domicilio completo | Régimen Fiscal
        const domReceptor = extras?.receptorDomicilio || cfdi.receptor.domicilioFiscal;
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
        doc.text('Domicilio:', ML, curY);
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text(domReceptor, ML + 50, curY, { width: rxCol * 2 - 50 });

        doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
        doc.text('Régimen Fiscal:', ML + rxCol * 2, curY);
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text(cfdi.receptor.regimenFiscal, ML + rxCol * 2 + 65, curY);
        curY += 10;

        // Fila 4: Entregar en (si existe)
        if (extras?.direccionEntrega) {
            doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
            doc.text('Entregar en:', ML, curY);
            doc.font('Helvetica').fontSize(7).fillColor('#000');
            doc.text(extras.direccionEntrega, ML + 55, curY, { width: CONTENT_W - 55 });
            curY += 10;
        }

        curY += 2;
        doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(0.5).strokeColor('#aaa').stroke();
        curY += 8;

        // ────────────────────────────────────────────────────────────────────
        // Items table header
        // ────────────────────────────────────────────────────────────────────
        const COL = {
            clave:  { x: ML,             w: 52 },
            cant:   { x: ML + 52,        w: 32 },
            unidad: { x: ML + 84,        w: 30 },
            desc:   { x: ML + 114,       w: 248 },
            vu:     { x: ML + 362,       w: 62 },
            importe:{ x: ML + 424,       w: 62 },
            iva:    { x: ML + 486,       w: 54 },
        };

        function drawTableHeader(y: number) {
            doc.rect(ML, y, CONTENT_W, 14).fillColor('#e8e8e8').fill();
            doc.fillColor('#000');
            const cols = [
                [COL.clave,   'Cód. Barras'],
                [COL.cant,    'Cant.'],
                [COL.unidad,  'Unidad'],
                [COL.desc,    'Descripción'],
                [COL.vu,      'V. Unitario'],
                [COL.importe, 'Importe'],
                [COL.iva,     'IVA'],
            ] as [typeof COL.clave, string][];
            cols.forEach(([col, label]) => {
                doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
                doc.text(label, col.x + 2, y + 3, { width: col.w - 4, align: col === COL.desc ? 'left' : 'right' });
            });
            return y + 14;
        }

        curY = drawTableHeader(curY);

        // ────────────────────────────────────────────────────────────────────
        // Rows
        // ────────────────────────────────────────────────────────────────────
        const ROW_H1 = 16;  // product row
        const ROW_H2 = 11;  // lote sub-row

        cfdi.conceptos.forEach((c, idx) => {
            const needH = ROW_H1 + ROW_H2 + 2;
            if (curY + needH > PAGE_H - 80) {
                addPage();
                drawMiniHeader();
                curY = drawTableHeader(curY);
            }

            const bg = idx % 2 === 0 ? '#ffffff' : '#f9f9f9';

            // Row 1 — product
            doc.rect(ML, curY, CONTENT_W, ROW_H1).fillColor(bg).fill();
            doc.fillColor('#000');
            doc.font('Helvetica').fontSize(7.5);
            doc.text(c.noIdentificacion || c.claveProdServ, COL.clave.x + 2, curY + 4, { width: COL.clave.w - 4, lineBreak: false });
            doc.text(fmt2(c.cantidad), COL.cant.x + 2, curY + 4, { width: COL.cant.w - 4, align: 'right', lineBreak: false });
            doc.text(c.unidad || c.claveUnidad, COL.unidad.x + 2, curY + 4, { width: COL.unidad.w - 4, lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(7.5);
            doc.text(c.descripcionLimpia, COL.desc.x + 2, curY + 4, { width: COL.desc.w - 4, lineBreak: false, ellipsis: true });
            doc.font('Helvetica').fontSize(7.5);
            doc.text(fmt2(c.valorUnitario), COL.vu.x + 2, curY + 4, { width: COL.vu.w - 4, align: 'right', lineBreak: false });
            doc.text(fmt2(c.importe), COL.importe.x + 2, curY + 4, { width: COL.importe.w - 4, align: 'right', lineBreak: false });
            doc.text(fmt2(c.ivaImporte), COL.iva.x + 2, curY + 4, { width: COL.iva.w - 4, align: 'right', lineBreak: false });
            curY += ROW_H1;

            // Row 2 — lote info
            doc.rect(ML, curY, CONTENT_W, ROW_H2).fillColor('#f0f4ff').fill();
            doc.font('Helvetica').fontSize(6.5).fillColor('#444');
            const loteStr = [
                c.lote ? `Lote: ${c.lote}` : '',
                c.fechaCad ? `Fec/Cad: ${c.fechaCad}` : '',
                c.pzas ? `Pzas: ${c.pzas}` : '',
                c.tasaIva > 0 ? `IVA: ${Math.round(c.tasaIva * 100)}%` : 'IVA exento',
            ].filter(Boolean).join('   ');
            doc.text(loteStr, COL.desc.x + 2, curY + 2, { width: COL.desc.w + COL.vu.w + COL.importe.w - 4 });
            doc.fillColor('#000');
            curY += ROW_H2;

            // Row bottom border
            doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(0.3).strokeColor('#ccc').stroke();
        });

        curY += 10;

        // ────────────────────────────────────────────────────────────────────
        // Totals + sellos on last page
        // ────────────────────────────────────────────────────────────────────
        const totalesH = 80;
        const sellosH = 130;
        const pagareH = 60;
        const qrSize = 90;
        const neededH = totalesH + sellosH + pagareH + qrSize + 20;

        if (curY + neededH > PAGE_H - 40) {
            addPage();
            drawMiniHeader();
        }

        // ── Totals box ──────────────────────────────────────────────────────
        const totBox_x = ML + CONTENT_W * 0.55;
        const totBox_w = CONTENT_W * 0.45;
        const totRows = [
            ['Subtotal', cfdi.subTotal],
            ['IVA Trasladado (16%)', cfdi.totalImpuestosTrasladados],
            ['Total', cfdi.total],
        ];
        let ty = curY;
        totRows.forEach(([label, val], i) => {
            const isTotal = i === totRows.length - 1;
            if (isTotal) doc.rect(totBox_x, ty, totBox_w, 16).fillColor('#1a3a6b').fill();
            else doc.rect(totBox_x, ty, totBox_w, 14).fillColor(i % 2 === 0 ? '#f5f5f5' : '#ececec').fill();
            doc.font('Helvetica-Bold').fontSize(isTotal ? 9 : 8).fillColor(isTotal ? '#fff' : '#000');
            doc.text(label as string, totBox_x + 4, ty + (isTotal ? 4 : 3), { width: totBox_w * 0.6 });
            doc.text(`$${fmt2(val as number)}`, totBox_x + totBox_w * 0.55, ty + (isTotal ? 4 : 3), { width: totBox_w * 0.42, align: 'right' });
            ty += isTotal ? 16 : 14;
        });
        curY = Math.max(ty, curY) + 6;

        // Importe en letra
        doc.rect(ML, curY, CONTENT_W * 0.52, 18).fillColor('#f0f0f0').fill();
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#555');
        doc.text('Importe con letra:', ML + 3, curY + 3, { lineBreak: false });
        doc.font('Helvetica').fontSize(6.5).fillColor('#000');
        doc.text(importeEnLetra(cfdi.total, cfdi.moneda), ML + 75, curY + 3, { width: CONTENT_W * 0.52 - 80 });
        curY += 22;

        // ── QR + Sellos ─────────────────────────────────────────────────────
        doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(0.6).strokeColor('#555').stroke();
        curY += 8;

        const qrX = ML;
        const sellosX = ML + qrSize + 14;
        const sellosW = CONTENT_W - qrSize - 14;

        doc.image(qrBuf, qrX, curY, { width: qrSize, height: qrSize });

        // SAT verification label
        doc.font('Helvetica').fontSize(5.5).fillColor('#333');
        doc.text('Verifique la autenticidad de este comprobante en:', qrX, curY + qrSize + 3, { width: qrSize });
        doc.text('verificacfdi.facturaelectronica.sat.gob.mx', qrX, curY + qrSize + 11, { width: qrSize });

        // Sello del CFDI
        let sy = curY;
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#444');
        doc.text('Sello Digital del CFDI (Emisor):', sellosX, sy);
        sy += 9;
        doc.font('Helvetica').fontSize(5.5).fillColor('#555');
        doc.text(cfdi.selloCFD, sellosX, sy, { width: sellosW, lineBreak: true });
        sy += 28;

        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#444');
        doc.text('Sello del SAT:', sellosX, sy);
        sy += 9;
        doc.font('Helvetica').fontSize(5.5).fillColor('#555');
        doc.text(cfdi.selloSAT, sellosX, sy, { width: sellosW, lineBreak: true });
        sy += 28;

        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#444');
        doc.text(`No. Certificado Emisor: ${cfdi.noCertificado}   |   No. Certificado SAT: ${cfdi.noCertSAT}   |   RFC PAC: ${cfdi.rfcProvCertif}`, sellosX, sy);
        sy += 10;

        curY = Math.max(curY + qrSize + 20, sy) + 8;

        // ── PAGARÉ ──────────────────────────────────────────────────────────
        if (curY + pagareH > PAGE_H - 30) {
            addPage();
            drawMiniHeader();
        }
        doc.moveTo(ML, curY).lineTo(ML + CONTENT_W, curY).lineWidth(1).strokeColor('#000').stroke();
        curY += 8;

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
        doc.text('PAGARÉ', ML, curY, { align: 'center', width: CONTENT_W });
        curY += 14;

        const pagareText =
            `Debo(emos) y pagaré(mos) incondicionalmente a la orden de ${cfdi.emisor.nombre} ` +
            `la cantidad de $${fmt2(cfdi.total)} (${importeEnLetra(cfdi.total, cfdi.moneda)}). ` +
            `Folio Fiscal: ${cfdi.uuid}. ` +
            `En caso de mora, se pagarán intereses moratorios conforme a la ley. ` +
            `Este pagaré es a la vista y exigible en ${cfdi.lugarExpedicion}.`;

        doc.font('Helvetica').fontSize(7).fillColor('#222');
        doc.text(pagareText, ML, curY, { width: CONTENT_W, align: 'justify' });
        curY += 40;

        // Firma line
        const firmaMid = ML + CONTENT_W / 2;
        doc.moveTo(firmaMid - 80, curY).lineTo(firmaMid + 80, curY).lineWidth(0.5).strokeColor('#000').stroke();
        curY += 6;
        doc.font('Helvetica').fontSize(7).fillColor('#555');
        doc.text('Firma del deudor', firmaMid - 80, curY, { width: 160, align: 'center' });

        // Page numbers — requiere bufferPages:true
        const totalPages = pageNum;
        for (let p = 0; p < totalPages; p++) {
            doc.switchToPage(p);
            doc.font('Helvetica').fontSize(7).fillColor('#777');
            doc.text(`Este documento es la representación impresa de un CFDI`, ML, PAGE_H - 22, { width: CONTENT_W / 2, align: 'left' });
            doc.text(`Página ${p + 1} de ${totalPages}`, ML, PAGE_H - 22, { width: CONTENT_W, align: 'right' });
        }

        stream.on('finish', () => resolve(outPath));
        stream.on('error', reject);
        doc.flushPages();
        doc.end();
    });
}
