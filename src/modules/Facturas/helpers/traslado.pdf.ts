import PDFDocument from 'pdfkit';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TrasladoItem {
    descripcion:     string;
    cantidad:        number;
    precio_unitario: number;
    subtotal_linea:  number;
    tasa_iva:        number;
    cod_barras?:     string;
    unidad?:         string;
    lotes: {
        lote:        string;
        fecha_venci: string;
        cantidad:    number;
    }[];
}

export interface DatosTrasladoPDF {
    folio:               number;
    fecha_emision:       string;          // DD/MM/YYYY HH:mm
    cod_int_pedido:      string;
    nombre_agente:       string | null;
    id_empresa_sys_anterior: number;
    // Emisor
    nom_empre:           string;
    rfc_empre:           string;
    // Receptor
    razon_social:        string;
    rfc_receptor:        string;
    calle_receptor:      string;
    colonia_receptor:    string;
    municipio_receptor:  string;
    estado_receptor:     string;
    // Totales
    subtotal:            number;
    iva:                 number;
    total:               number;
    // Artículos
    items:               TrasladoItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt2(n: number): string {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Generador ────────────────────────────────────────────────────────────────

export function generarTrasladoPDFBuffer(datos: DatosTrasladoPDF): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
            size: 'LETTER', margin: 0,
            info: { Title: `Traslado ${datos.folio}` },
        });
        doc.on('data',  (c: Buffer) => chunks.push(c));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PW    = 612;
        const PH    = 792;
        const MX    = 28;
        const MY    = 20;
        const CW    = PW - MX * 2;   // 556
        const NEGRO = '#1a1a1a';
        const GR    = '#6b7280';
        const LBORD = '#d1d5db';
        const AZUL  = '#4f46e5';

        const hline = (y: number, x1 = MX, x2 = MX + CW, w = 0.5, c = LBORD) =>
            doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).stroke(c);

        let y = MY;

        // ══════════════════════════════════════════════════════════════════════
        // 1. HEADER
        // ══════════════════════════════════════════════════════════════════════

        // Logo izquierda
        const LOGO_W = 72;
        doc.circle(MX + 26, y + 26, 24).lineWidth(1.5).stroke('#6b7280');
        doc.font('Helvetica-Bold').fontSize(22).fillColor('#374151')
           .text('S', MX + 15, y + 14, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151')
           .text('Saher', MX + 4, y + 42, { width: LOGO_W, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(6).fillColor(GR)
           .text('Distribuidora Farmacéutica', MX, y + 54, { width: LOGO_W + 4, align: 'center', lineBreak: false });

        // Título centro
        doc.font('Helvetica-Bold').fontSize(15).fillColor(AZUL)
           .text('TRASLADO DE MERCANCÍA', MX + LOGO_W + 10, y + 10, { width: CW - LOGO_W - 120, align: 'center', lineBreak: false });

        // Recuadro folio/fecha derecha
        const RW  = 110;
        const RX  = MX + CW - RW;
        doc.rect(RX, y, RW, 62).lineWidth(0.5).stroke(LBORD);

        const infoR = (label: string, val: string, iy: number) => {
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor(GR)
               .text(label, RX + 4, iy, { width: RW - 8, lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(val, RX + 4, iy + 8, { width: RW - 8, lineBreak: false });
        };
        infoR('Folio',           String(datos.folio),         y + 2);
        infoR('Pedido',          datos.cod_int_pedido,        y + 21);
        infoR('Fecha de Emisión', datos.fecha_emision,        y + 40);

        y += 68;
        hline(y, MX, MX + CW, 1, '#9ca3af');
        y += 6;

        // ══════════════════════════════════════════════════════════════════════
        // 2. EMISOR / RECEPTOR
        // ══════════════════════════════════════════════════════════════════════

        const COL2 = CW / 2 - 4;
        const R_X  = MX + COL2 + 8;

        // Cabeceras
        doc.rect(MX, y, COL2, 12).fill('#f3f4f6');
        doc.rect(R_X, y, COL2, 12).fill('#f3f4f6');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
           .text('EMISOR', MX + 4, y + 2, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
           .text('RECEPTOR', R_X + 4, y + 2, { lineBreak: false });
        y += 14;

        const emisorLines = [
            datos.nom_empre.toUpperCase(),
            datos.rfc_empre,
            'PASTOR ROUIX #2314 B',
            'INDUSTRIAL EL PALMITO, C.P. 80160',
            'CULIACÁN, SINALOA',
        ];
        const receptorLines = [
            datos.razon_social.toUpperCase(),
            datos.rfc_receptor,
            datos.calle_receptor.toUpperCase(),
            datos.colonia_receptor.toUpperCase(),
            `${datos.municipio_receptor.toUpperCase()}, ${datos.estado_receptor.toUpperCase()}`,
        ];

        const startY = y;
        emisorLines.forEach(line => {
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(line, MX + 2, y, { width: COL2 - 4, lineBreak: false });
            y += 9;
        });

        let ry = startY;
        receptorLines.forEach(line => {
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(line, R_X + 2, ry, { width: COL2 - 4, lineBreak: false });
            ry += 9;
        });

        // Agente debajo del emisor
        y = Math.max(y, ry) + 4;
        doc.font('Helvetica').fontSize(7).fillColor(GR)
           .text(`Agente: ${datos.nombre_agente ?? '—'}   |   ID Sistema Anterior: #${datos.id_empresa_sys_anterior}`, MX + 2, y, { lineBreak: false });
        y += 12;

        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 5;

        // ══════════════════════════════════════════════════════════════════════
        // 3. TABLA
        // Cant(42) Unidad(36) C.Barras(88) Descripción(158) Lote(70) Caducidad(52) PrecioU(55) Importe(55)
        // Total = 556 ✓
        // ══════════════════════════════════════════════════════════════════════

        const COLS = [
            { label: 'Cantidad',    w:  42, align: 'right'  as const },
            { label: 'Unidad',      w:  36, align: 'center' as const },
            { label: 'C. Barras',   w:  88, align: 'left'   as const },
            { label: 'Descripción', w: 158, align: 'left'   as const },
            { label: 'Lote',        w:  70, align: 'left'   as const },
            { label: 'Caducidad',   w:  52, align: 'center' as const },
            { label: 'Precio U.',   w:  55, align: 'right'  as const },
            { label: 'Importe',     w:  55, align: 'right'  as const },
        ];

        const TH = 13;
        const TR = 12;

        // Header tabla
        doc.rect(MX, y, CW, TH).fill('#e5e7eb');
        let cx = MX;
        COLS.forEach(col => {
            doc.font('Helvetica-Bold').fontSize(7).fillColor(NEGRO)
               .text(col.label, cx + 3, y + 3,
                     { width: col.w - 6, align: col.align, lineBreak: false });
            cx += col.w;
        });
        y += TH;
        hline(y);

        // Filas
        let rowIdx = 0;
        let totalPiezas = 0;

        datos.items.forEach(item => {
            totalPiezas += item.cantidad;

            // Agrupar lotes para mostrar en columna
            const lotesStr    = item.lotes.map(l => l.lote).join('\n');
            const caducStr    = item.lotes.map(l => l.fecha_venci).join('\n');

            // Altura dinámica según número de lotes
            const numLineas   = Math.max(item.lotes.length, 1);
            const rowH        = Math.max(TR, numLineas * 10 + 2);

            if (rowIdx % 2 === 0) doc.rect(MX, y, CW, rowH).fill('#f9fafb');

            const vals = [
                item.cantidad.toFixed(4),
                (item.unidad ?? 'PZA').toUpperCase(),
                item.cod_barras ?? '',
                item.descripcion,
                lotesStr,
                caducStr,
                fmt2(item.precio_unitario),
                fmt2(item.subtotal_linea),
            ];

            cx = MX;
            COLS.forEach((col, ci) => {
                const isBold = ci === 3;
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(7).fillColor(NEGRO)
                   .text(vals[ci], cx + 3, y + 2,
                         { width: col.w - 6, align: col.align, lineBreak: false, ellipsis: false });
                cx += col.w;
            });

            y += rowH;
            rowIdx++;
        });

        // Filas vacías mínimo 2
        const blanks = Math.max(2, 6 - datos.items.length);
        for (let i = 0; i < blanks; i++) {
            if ((rowIdx + i) % 2 === 0) doc.rect(MX, y, CW, TR).fill('#f9fafb');
            y += TR;
        }

        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 5;

        // ══════════════════════════════════════════════════════════════════════
        // 4. TOTALES
        // ══════════════════════════════════════════════════════════════════════

        doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
           .text('Total Piezas', MX + 50, y + 2, { lineBreak: false });
        doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
           .text(totalPiezas.toFixed(4), MX + 120, y + 2, { lineBreak: false });

        const TLBL_W = 70;
        const TVAL_W = 75;
        const TX     = MX + CW - TLBL_W - TVAL_W;

        const tasas    = [...new Set(datos.items.filter(d => d.tasa_iva > 0).map(d => d.tasa_iva))];
        const ivaLabel = tasas.length === 1 ? `IVA ${(tasas[0] * 100).toFixed(0)}%` : 'IVA';

        [
            { label: 'Subtotal:',     value: fmt2(datos.subtotal) },
            { label: ivaLabel + ':',  value: fmt2(datos.iva)      },
            { label: 'Total:',        value: fmt2(datos.total)    },
        ].forEach((row, i) => {
            const ty      = y + i * 13;
            const isTotal = i === 2;
            if (isTotal) doc.rect(TX, ty, TLBL_W + TVAL_W, 13).fill('#ede9fe');
            doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
               .text(row.label, TX, ty + 3, { width: TLBL_W, align: 'right', lineBreak: false });
            doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
               .text(row.value, TX + TLBL_W + 4, ty + 3, { width: TVAL_W - 8, align: 'right', lineBreak: false });
        });

        y += 3 * 13 + 12;
        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 6;

        // ══════════════════════════════════════════════════════════════════════
        // 5. NOTA
        // ══════════════════════════════════════════════════════════════════════

        doc.rect(MX, y, CW, 22).fill('#eff6ff');
        doc.font('Helvetica-Bold').fontSize(7).fillColor(AZUL)
           .text('NOTA:', MX + 5, y + 4, { lineBreak: false });
        doc.font('Helvetica').fontSize(7).fillColor('#1e40af')
           .text(
               'Comprobante interno de traslado de mercancía entre empresas del mismo grupo. ' +
               'No constituye un CFDI timbrado ante el SAT.',
               MX + 38, y + 4, { width: CW - 44 },
           );
        y += 30;

        // ══════════════════════════════════════════════════════════════════════
        // 6. FIRMAS
        // ══════════════════════════════════════════════════════════════════════

        const FW  = 150;
        const FX1 = MX + 40;
        const FX2 = MX + CW - 40 - FW;
        const FY  = y + 30;

        hline(FY, FX1, FX1 + FW, 0.5, '#9ca3af');
        hline(FY, FX2, FX2 + FW, 0.5, '#9ca3af');
        doc.font('Helvetica').fontSize(7.5).fillColor(GR)
           .text('Entregado por', FX1, FY + 4, { width: FW, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(GR)
           .text('Recibido por',  FX2, FY + 4, { width: FW, align: 'center', lineBreak: false });

        // ══════════════════════════════════════════════════════════════════════
        // 7. FOOTER
        // ══════════════════════════════════════════════════════════════════════

        const FOOTER_Y = PH - 20;
        hline(FOOTER_Y, MX, MX + CW, 0.3, '#e5e7eb');
        doc.font('Helvetica').fontSize(6.5).fillColor(GR)
           .text(`Folio: ${datos.folio}  |  Pedido: ${datos.cod_int_pedido}  |  ${datos.fecha_emision}`,
                 MX, FOOTER_Y + 4, { width: CW, align: 'center', lineBreak: false });

        doc.end();
    });
}
