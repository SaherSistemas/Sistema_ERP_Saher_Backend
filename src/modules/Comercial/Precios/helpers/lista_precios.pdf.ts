import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface RenglonListaPrecios {
    codigo: number | string;
    codigo_barras: string;
    articulo: string;
    precio: number;
    iva_pct: number;
    precio_con_iva: number;
    existencia: number;
}

const fmtMoneda = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rutaLogo(): string | null {
    const candidatos = [
        process.env.RUTA_LOGO_PDF ? path.resolve(process.cwd(), process.env.RUTA_LOGO_PDF) : null,
        path.resolve(process.cwd(), 'assets', 'logo_saher.png'),
    ].filter(Boolean) as string[];
    return candidatos.find(p => fs.existsSync(p)) ?? null;
}

/** Listado de precios de una lista (hoja carta, varias páginas con encabezado repetido). */
export function generarPdfListaPrecios(d: { nombre_lista: string; fecha: string; renglones: RenglonListaPrecios[] }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true, info: { Title: `Lista de precios ${d.nombre_lista}` } });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PW = 612, PH = 792, MX = 30, CW = PW - MX * 2;
        const AZUL = '#2b3a8f', AZUL_C = '#b9c0e4', NEGRO = '#1a1a1a';
        const COLS = [
            { l: 'CÓD.', w: 40, a: 'left' }, { l: 'ARTÍCULO', w: 214, a: 'left' }, { l: 'CÓD. BARRAS', w: 88, a: 'left' }, { l: 'EXIST.', w: 40, a: 'right' },
            { l: 'PRECIO', w: 62, a: 'right' }, { l: 'IVA', w: 34, a: 'right' }, { l: 'C/IVA', w: CW - (40 + 214 + 88 + 40 + 62 + 34), a: 'right' },
        ] as const;
        const FILA = 15, TOPE = PH - 50;
        const logo = rutaLogo();

        const encabezadoPagina = (): number => {
            if (logo) doc.image(logo, MX, 24, { fit: [110, 40] });
            else doc.font('Helvetica-Bold').fontSize(22).fillColor(AZUL).text('Saher', MX, 30, { lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL)
                .text('FARMACIAS SAHER DE SINALOA S. DE R.L. DE C.V.', MX, 26, { width: CW, align: 'right', lineBreak: false });
            doc.font('Helvetica').fontSize(8).fillColor(AZUL)
                .text(`Fecha: ${d.fecha}`, MX, 40, { width: CW, align: 'right', lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(14).fillColor(AZUL).text(`LISTA DE PRECIOS · ${d.nombre_lista}`, MX, 74, { lineBreak: false });
            let y = 98;
            doc.rect(MX, y, CW, 17).fill(AZUL_C);
            let cx = MX;
            for (const c of COLS) {
                doc.font('Helvetica-Bold').fontSize(7.5).fillColor(AZUL).text(c.l, cx + 3, y + 5, { width: c.w - 6, align: c.a, lineBreak: false });
                cx += c.w;
            }
            return y + 17;
        };

        let y = encabezadoPagina();
        d.renglones.forEach((r, i) => {
            if (y + FILA > TOPE) {
                doc.addPage();
                y = encabezadoPagina();
            }
            if (i % 2 === 1) doc.rect(MX, y, CW, FILA).fill('#f3f5fb');
            const vals = [String(r.codigo), r.articulo, r.codigo_barras || '', String(r.existencia), fmtMoneda(r.precio), `${r.iva_pct}%`, fmtMoneda(r.precio_con_iva)];
            let cx = MX;
            COLS.forEach((c, k) => {
                doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
                    .text(vals[k], cx + 3, y + 4, { width: c.w - 6, align: c.a, height: 10, ellipsis: true, lineBreak: false });
                cx += c.w;
            });
            y += FILA;
        });
        if (!d.renglones.length) {
            doc.font('Helvetica').fontSize(10).fillColor(NEGRO).text('Esta lista no tiene artículos con precio y existencia.', MX, y + 14, { lineBreak: false });
        }

        // Pie con número de página
        const paginas = doc.bufferedPageRange();
        for (let p = 0; p < paginas.count; p++) {
            doc.switchToPage(paginas.start + p);
            doc.font('Helvetica').fontSize(7).fillColor('#666')
                .text('Precios sujetos a cambio sin previo aviso. "C/IVA" = precio con IVA incluido.', MX, PH - 32, { width: CW - 80, align: 'left', lineBreak: false })
                .text(`Página ${p + 1} de ${paginas.count}`, MX, PH - 32, { width: CW, align: 'right', lineBreak: false });
        }
        doc.end();
    });
}
