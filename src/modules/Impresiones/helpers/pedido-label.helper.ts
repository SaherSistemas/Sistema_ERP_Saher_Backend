import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const W   = 4 * 72;   // 288 pt  (4")
const H   = 3 * 72;   // 216 pt  (3")
const PAD = 10;

export interface InfoPedidoLabel {
    cod_int_pedido_alm: string;
    surtidor:           string;
}

// Hoja del pedido para surtir como etiqueta PDF (misma medida que la de bultos), para imprimirla en esa impresora
export async function generarPdfPedido(info: InfoPedidoLabel): Promise<string> {
    const outDir = process.env.RUTA_PDFS_GUARDAR ?? path.join(os.tmpdir(), 'etiquetas_zebra');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `pedido_${uuidv4()}.pdf`);

    const QR_SIZE = 110;
    const qrBuf = await QRCode.toBuffer(info.cod_int_pedido_alm, {
        type: 'png', width: QR_SIZE, margin: 1, errorCorrectionLevel: 'L',
    });

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);
        doc.addPage({ size: [W, H], margin: 0 });

        const qrY = (H - QR_SIZE) / 2;
        doc.image(qrBuf, PAD, qrY, { width: QR_SIZE, height: QR_SIZE });

        const INF_X = PAD + QR_SIZE + 10;
        const INF_W = W - INF_X - PAD;

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#555');
        doc.text('COD PEDIDO', INF_X, qrY + 6, { width: INF_W, lineBreak: false });

        const cod = info.cod_int_pedido_alm;
        const codSize = cod.length > 22 ? 9 : cod.length > 18 ? 10 : 12;
        doc.font('Helvetica-Bold').fontSize(codSize).fillColor('#000');
        doc.text(cod, INF_X, qrY + 20, { width: INF_W, lineBreak: false });

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#555');
        doc.text('SURTIDOR', INF_X, qrY + 52, { width: INF_W, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
        doc.text(info.surtidor, INF_X, qrY + 66, { width: INF_W, height: 40, ellipsis: true });

        stream.on('finish', () => resolve(outPath));
        stream.on('error', reject);
        doc.end();
    });
}
