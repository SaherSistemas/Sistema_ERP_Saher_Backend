import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface DatosDevolucionProveedor {
    folio_devolucion: string;
    fecha: string | Date;
    proveedor: string;
    rfc: string;
    folio_factura: string;
    motivo: string;
    observaciones: string;
    usuario: string;
    subtotal: number;
    iva: number;
    total: number;
    renglones: { articulo: string; codigo: string; lote: string; caducidad: string | Date | null; cantidad: number; precio: number; iva: number }[];
}

const fmtMoneda = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (d: string | Date | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

function rutaLogo(): string | null {
    const candidatos = [
        process.env.RUTA_LOGO_PDF ? path.resolve(process.cwd(), process.env.RUTA_LOGO_PDF) : null,
        path.resolve(process.cwd(), 'assets', 'logo_saher.png'),
    ].filter(Boolean) as string[];
    return candidatos.find(p => fs.existsSync(p)) ?? null;
}

/** Documento de devolución de mercancía al proveedor (hoja carta): va con la mercancía que se regresa. */
export function generarPdfDevolucionProveedor(d: DatosDevolucionProveedor): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 0, info: { Title: `Devolución a proveedor ${d.folio_devolucion}` } });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PW = 612, PH = 792, MX = 36, CW = PW - MX * 2;
        const AZUL = '#2b3a8f', AZUL_C = '#b9c0e4', NEGRO = '#1a1a1a';

        // Encabezado
        const logo = rutaLogo();
        if (logo) doc.image(logo, MX, 30, { fit: [130, 46] });
        else doc.font('Helvetica-Bold').fontSize(26).fillColor(AZUL).text('Saher', MX, 36, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL)
            .text('FARMACIAS SAHER DE SINALOA S. DE R.L. DE C.V.', MX, 30, { width: CW, align: 'right', lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(AZUL)
            .text('Calle Pastor Rouix 2314 Int. B Colonia Industrial El Palmito.', MX, 42, { width: CW, align: 'right', lineBreak: false })
            .text('C.P. 80160, Culiacán, Sinaloa  RFC: FSS231107F4', MX, 52, { width: CW, align: 'right', lineBreak: false });

        let y = 90;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(AZUL).text('DEVOLUCIÓN DE MERCANCÍA A PROVEEDOR', MX, y, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#d11a1a').text(d.folio_devolucion, MX, y + 1, { width: CW, align: 'right', lineBreak: false });
        y += 28;

        // Datos
        const campo = (lbl: string, val: string, x: number, yy: number, w: number) => {
            doc.font('Helvetica-Bold').fontSize(8).fillColor(AZUL).text(lbl, x, yy, { lineBreak: false });
            doc.font('Helvetica').fontSize(9).fillColor(NEGRO).text(val || '—', x + 78, yy - 1, { width: w - 80, lineBreak: false, ellipsis: true });
        };
        doc.roundedRect(MX, y, CW, 62, 6).lineWidth(1).stroke(AZUL);
        campo('PROVEEDOR:', d.proveedor, MX + 8, y + 8, CW / 2);
        campo('RFC:', d.rfc, MX + CW / 2, y + 8, CW / 2);
        campo('FACTURA:', d.folio_factura, MX + 8, y + 24, CW / 2);
        campo('FECHA:', fmtFecha(d.fecha), MX + CW / 2, y + 24, CW / 2);
        campo('MOTIVO:', d.motivo, MX + 8, y + 40, CW);
        y += 74;

        // Tabla
        const COLS = [
            { l: 'ARTÍCULO', w: 190 }, { l: 'CÓDIGO', w: 84 }, { l: 'LOTE', w: 62 }, { l: 'CADUCIDAD', w: 60 },
            { l: 'CANT.', w: 36 }, { l: 'COSTO', w: 52 }, { l: 'IMPORTE', w: CW - (190 + 84 + 62 + 60 + 36 + 52) },
        ];
        doc.rect(MX, y, CW, 18).fill(AZUL_C);
        let cx = MX;
        for (const c of COLS) {
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(AZUL).text(c.l, cx, y + 6, { width: c.w, align: 'center', lineBreak: false });
            cx += c.w;
        }
        y += 18;
        for (const r of d.renglones) {
            const vals = [r.articulo, r.codigo, r.lote === 'S/L' ? '—' : r.lote, fmtFecha(r.caducidad), String(r.cantidad), fmtMoneda(r.precio), fmtMoneda(r.precio * r.cantidad)];
            cx = MX;
            COLS.forEach((c, i) => {
                doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
                    .text(vals[i], cx + 3, y + 4, { width: c.w - 6, align: i >= 4 ? 'right' : (i === 3 ? 'center' : 'left'), height: 10, ellipsis: true });
                cx += c.w;
            });
            doc.moveTo(MX, y + 16).lineTo(MX + CW, y + 16).lineWidth(0.4).stroke(AZUL);
            y += 16;
        }
        y += 8;

        // Totales
        const TX = MX + CW - 190;
        const tot: [string, number][] = [['SUBTOTAL', d.subtotal], ['IVA', d.iva], ['TOTAL', d.total]];
        tot.forEach(([l, v], i) => {
            doc.rect(TX, y + i * 18, 80, 18).lineWidth(0.8).stroke(AZUL);
            doc.rect(TX + 80, y + i * 18, 110, 18).lineWidth(0.8).stroke(AZUL);
            doc.font('Helvetica-Bold').fontSize(8).fillColor(AZUL).text(l, TX, y + i * 18 + 5, { width: 76, align: 'right', lineBreak: false });
            doc.font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(NEGRO)
                .text(fmtMoneda(v), TX + 84, y + i * 18 + 4, { width: 102, align: 'right', lineBreak: false });
        });
        if (d.observaciones) {
            doc.font('Helvetica-Bold').fontSize(8).fillColor(AZUL).text('OBSERVACIONES:', MX, y + 2, { lineBreak: false });
            doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO).text(d.observaciones, MX, y + 14, { width: CW - 210, height: 40 });
        }
        y += 54 + 40;

        // Firmas
        const FW = 200;
        doc.moveTo(MX, y).lineTo(MX + FW, y).lineWidth(0.8).stroke(AZUL);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(AZUL).text('ENTREGA (ALMACÉN)', MX, y + 4, { width: FW, align: 'center' });
        if (d.usuario) doc.font('Helvetica').fontSize(8).fillColor(NEGRO).text(d.usuario, MX, y - 12, { width: FW, align: 'center', lineBreak: false });
        doc.moveTo(MX + CW - FW, y).lineTo(MX + CW, y).lineWidth(0.8).stroke(AZUL);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(AZUL).text('RECIBE (PROVEEDOR) NOMBRE Y FIRMA', MX + CW - FW, y + 4, { width: FW, align: 'center' });

        doc.font('Helvetica').fontSize(7).fillColor('#666')
            .text('La nota de crédito correspondiente queda pendiente hasta que el proveedor la emita.', MX, PH - 50, { width: CW, align: 'center', lineBreak: false });

        doc.end();
    });
}
