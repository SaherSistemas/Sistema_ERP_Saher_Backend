import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const W   = 4 * 72;   // 288 pt  (4")
const H   = 3 * 72;   // 216 pt  (3")
const PAD = 8;

export interface InfoBultoLabel {
    cod_bulto:            string;
    num_bulto:            number;
    total_bulto:          number;
    cod_int_pedido_alm:   string;
    fecha_facturado:      string;
    razon_social_cliente: string;
    nom_corto_cliente:    string;
    empacador:            string;
    agente:               string | null;
    surtidores:           string | null;
    checadores:           string | null;
}

function box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
    doc.rect(x, y, w, h).lineWidth(0.6).strokeColor('#000').stroke();
}

export async function generarPdfBulto(info: InfoBultoLabel): Promise<string> {
    const outDir = path.join(os.tmpdir(), 'etiquetas_zebra');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `bulto_${uuidv4()}.pdf`);

    const QR_SIZE = 85;
    const qrBuf = await QRCode.toBuffer(info.cod_bulto, {
        type: 'png', width: QR_SIZE, margin: 1, errorCorrectionLevel: 'M',
    });

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);
        doc.addPage({ size: [W, H], margin: 0 });

        // ── EMISOR ───────────────────────────────────────────────────────────
        let y = PAD;
        doc.font('Helvetica').fontSize(6.5).fillColor('#444');
        doc.text('Emisor: FARMACIAS SAHER DE SINALOA S DE RL DE CV', PAD, y, {
            width: W - PAD * 2, align: 'center',
        });
        y += 10;
        doc.moveTo(PAD, y).lineTo(W - PAD, y).lineWidth(0.6).strokeColor('#000').stroke();
        y += 5;

        // ── SECCIÓN SUPERIOR: QR izq | DESTINATARIO der ──────────────────────
        const QR_X  = PAD;
        const INF_X = QR_X + QR_SIZE + 8;
        const INF_W = W - INF_X - PAD;

        doc.image(qrBuf, QR_X, y, { width: QR_SIZE, height: QR_SIZE });

        // Destinatario
        let iy = y;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#555');
        doc.text('Destinatario', INF_X, iy);
        iy += 11;

        // Razon Social
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
        doc.text(info.razon_social_cliente, INF_X, iy, { width: INF_W, ellipsis: true, lineBreak: false });
        iy += 13;

        // Nom Comercial — grande
        const nomSize = info.nom_corto_cliente.length > 18 ? 11 : 13;
        doc.font('Helvetica-Bold').fontSize(nomSize).fillColor('#000');
        doc.text(info.nom_corto_cliente, INF_X, iy, { width: INF_W, ellipsis: true, lineBreak: false });
        iy += nomSize + 5;

        // Fecha
        doc.font('Helvetica').fontSize(8).fillColor('#333');
        doc.text(`Fact: ${info.fecha_facturado ?? '—'}`, INF_X, iy);

        y += QR_SIZE + 6;

        // ── CAJA: COD. PEDIDO ────────────────────────────────────────────────
        const COD_H   = 22;
        const LABEL_W_COD = 52;
        const VAL_W   = W - PAD * 2 - LABEL_W_COD - 8;
        // Ajusta tamaño para que quepa en una sola línea
        const codSize = info.cod_int_pedido_alm.length > 22 ? 8 : info.cod_int_pedido_alm.length > 18 ? 9 : 11;
        box(doc, PAD, y, W - PAD * 2, COD_H);
        doc.font('Helvetica').fontSize(7.5).fillColor('#555');
        doc.text('Cod. Pedido:', PAD + 4, y + (COD_H - 8) / 2, { width: LABEL_W_COD, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(codSize).fillColor('#000');
        doc.text(info.cod_int_pedido_alm, PAD + 4 + LABEL_W_COD, y + (COD_H - codSize) / 2, {
            width: VAL_W, lineBreak: false, ellipsis: false,
        });
        y += COD_H;

        // ── CAJA: BULTOS | PERSONAL ──────────────────────────────────────────
        const ROW_H  = 36;
        const BULTO_W = 52;
        const PERS_W  = W - PAD * 2 - BULTO_W;

        box(doc, PAD,            y, BULTO_W, ROW_H);
        box(doc, PAD + BULTO_W,  y, PERS_W,  ROW_H);

        // Bultos
        doc.font('Helvetica').fontSize(7).fillColor('#555');
        doc.text('Bultos:', PAD + 3, y + 3);
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#000');
        doc.text(`${info.num_bulto} de ${info.total_bulto}`, PAD + 3, y + 13, {
            width: BULTO_W - 6, align: 'center',
        });

        // Personal — fuente adaptada para que quepan en una línea
        const px   = PAD + BULTO_W + 4;
        const pW   = PERS_W - 8;
        const pFnt = 7;
        doc.font('Helvetica').fontSize(pFnt).fillColor('#333');
        const py0  = y + 4;
        const rowGap = (ROW_H - 6) / 3;
        doc.text(`Surtido:`,  px, py0,              { width: 36, lineBreak: false });
        doc.font('Helvetica-Bold').text(info.surtidores ?? 'N/A', px + 36, py0,              { width: pW - 36, lineBreak: false, ellipsis: true });
        doc.font('Helvetica') .text(`Checado:`,  px, py0 + rowGap,      { width: 36, lineBreak: false });
        doc.font('Helvetica-Bold').text(info.checadores ?? 'N/A', px + 36, py0 + rowGap,      { width: pW - 36, lineBreak: false, ellipsis: true });
        doc.font('Helvetica') .text(`Empacado:`, px, py0 + rowGap * 2,  { width: 36, lineBreak: false });
        doc.font('Helvetica-Bold').text(info.empacador  ?? 'N/A', px + 36, py0 + rowGap * 2,  { width: pW - 36, lineBreak: false, ellipsis: true });
        y += ROW_H;

        // ── PIE INFO ─────────────────────────────────────────────────────────
        y += 4;
        doc.font('Helvetica').fontSize(6.5).fillColor('#555');
        doc.text(
            `Quim. Resp: Jesus Andres Nuñez Lopez   Ced: 1433424   Agente: ${info.agente ?? 'N/A'}`,
            PAD, y, { width: W - PAD * 2 }
        );
        y += 8;
        doc.text(`Ciudad: Mazatlán, Sinaloa`, PAD, y, { width: W - PAD * 2 });
        y += 9;

        // ── NO. PEDIDO GRANDE AL FONDO ────────────────────────────────────────
        doc.moveTo(PAD, y).lineTo(W - PAD, y).lineWidth(0.5).strokeColor('#000').stroke();
        y += 3;

        const pedSize = info.cod_int_pedido_alm.length > 18 ? 14 : 18;
        doc.font('Helvetica-Bold').fontSize(pedSize).fillColor('#000');
        doc.text(info.cod_int_pedido_alm, PAD, y, { width: W - PAD * 2, align: 'center' });

        doc.end();
        stream.on('finish', () => resolve(outPath));
        stream.on('error', reject);
    });
}
