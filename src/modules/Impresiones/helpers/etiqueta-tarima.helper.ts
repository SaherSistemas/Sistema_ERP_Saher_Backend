import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const W = 4 * 72;   // 288 pt  (4")
const H = 2 * 72;   // 144 pt  (2")
const PAD = 8;

export interface LineaEtiquetaTarima {
    nombre:     string;
    cantidad:   number;
    cajasCount: number;
}

export interface DatosEtiquetaTarima {
    art:      { des_artic: string; cod_barr_artic: string };
    lote:     { numero_lote_sucursal: string; fecha_venci_lote_sucursal?: string | null };
    lineas:   LineaEtiquetaTarima[];
    usuario?: string;
}

function fmtFecha(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
}

function hoy(): string {
    return fmtFecha(new Date().toISOString());
}

export async function generarPdfEtiquetasTarima(datos: DatosEtiquetaTarima): Promise<string> {
    const outDir = path.join(os.tmpdir(), 'etiquetas_zebra');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `etiqueta_${uuidv4()}.pdf`);

    // 3 etiquetas por caja por línea
    const etiquetas: Array<{
        nombre_tarima: string;
        pzas_por_caja: number;
        num_caja:      number;
        total_cajas:   number;
    }> = [];

    for (const linea of datos.lineas) {
        const cajas       = Math.max(1, linea.cajasCount);
        const pzasPorCaja = linea.cantidad / cajas;
        for (let caja = 1; caja <= cajas; caja++) {
            for (let i = 0; i < 3; i++) {
                etiquetas.push({
                    nombre_tarima: linea.nombre,
                    pzas_por_caja: pzasPorCaja,
                    num_caja:      caja,
                    total_cajas:   cajas,
                });
            }
        }
    }

    // QR solo contiene el código de barras
    const QR_SIZE = 90;
    const qrBuf = await QRCode.toBuffer(datos.art.cod_barr_artic, {
        type: 'png',
        width: QR_SIZE,
        margin: 1,
        errorCorrectionLevel: 'M',
    });

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);

        // Layout: QR a la izquierda, info a la derecha
        const QR_COL = QR_SIZE + PAD * 2;    // zona izquierda
        const INFO_X = QR_COL + 4;           // inicio zona derecha
        const INFO_W = W - INFO_X - PAD;     // ancho zona info

        for (const et of etiquetas) {
            doc.addPage({ size: [W, H], margin: 0 });

            // ── QR centrado verticalmente ───────────────────────────────────
            const qrY = (H - QR_SIZE - 12) / 2;
            doc.image(qrBuf, PAD, qrY, { width: QR_SIZE, height: QR_SIZE });

            // Código numérico bajo el QR
            doc.font('Helvetica').fontSize(6).fillColor('#000');
            doc.text(datos.art.cod_barr_artic, PAD, qrY + QR_SIZE + 2, {
                width: QR_SIZE,
                align: 'center',
                lineBreak: false,
            });

            // Línea divisora vertical
            doc.moveTo(QR_COL, PAD)
               .lineTo(QR_COL, H - PAD)
               .lineWidth(0.5).strokeColor('#bbb').stroke();

            // ── INFO a la derecha ──────────────────────────────────────────
            const rows: [string, string][] = [
                ['Lote:',      datos.lote.numero_lote_sucursal ?? '—'],
                ['Fec Ent:',   hoy()],
                ['Ubi Bod:',   et.nombre_tarima],
                ['Pzas/caja:', et.pzas_por_caja.toFixed(0)],
            ];
            if (datos.usuario) rows.push(['Usuario:', datos.usuario]);

            // Nombre artículo — calcula alto que ocupa
            const nameSize = datos.art.des_artic.length > 30 ? 9 : 10;
            doc.font('Helvetica-Bold').fontSize(nameSize);
            const nameH = doc.heightOfString(datos.art.des_artic, { width: INFO_W });

            // Espacio restante después del nombre se reparte entre las filas
            const available = H - PAD * 2 - nameH - 4;
            const ROW_H     = available / rows.length;
            const LABEL_W_COL = 52;
            const rowFontSize = Math.min(10, ROW_H * 0.72);

            // Nombre
            let y = PAD;
            doc.font('Helvetica-Bold').fontSize(nameSize).fillColor('#000');
            doc.text(datos.art.des_artic, INFO_X, y, { width: INFO_W, lineBreak: true, ellipsis: true });
            y += nameH + 4;

            // Filas distribuidas
            doc.fontSize(rowFontSize);
            for (const [label, val] of rows) {
                const rowY = y + (ROW_H - rowFontSize) / 2;
                doc.font('Helvetica-Bold').fillColor('#000')
                   .text(label, INFO_X, rowY, { width: LABEL_W_COL, lineBreak: false });
                doc.font('Helvetica')
                   .text(val, INFO_X + LABEL_W_COL, rowY, { width: INFO_W - LABEL_W_COL, lineBreak: false });
                y += ROW_H;
            }
        }

        doc.end();
        stream.on('finish', () => resolve(outPath));
        stream.on('error', reject);
    });
}
