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
}

export interface DatosTrasladoPDF {
    folio:             number;
    fecha_emision:     string;          // DD/MM/YYYY HH:mm
    cod_int_pedido:    string;
    nombre_agente:     string | null;
    id_empresa_sys_anterior: number;    // ID en el sistema viejo (POS)
    // Emisor
    nom_empre:         string;
    rfc_empre:         string;
    // Receptor
    razon_social:      string;
    rfc_receptor:      string;
    calle_receptor:    string;
    colonia_receptor:  string;
    municipio_receptor: string;
    estado_receptor:   string;
    // Totales
    subtotal:          number;
    iva:               number;
    total:             number;
    // Artículos
    items:             TrasladoItem[];
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
        const MX    = 28;
        const MY    = 22;
        const CW    = PW - MX * 2;   // 556 pts
        const GR    = '#888888';
        const NEGRO = '#1a1a1a';
        const LBORD = '#d1d5db';
        const AZUL  = '#4f46e5';

        const hline = (y: number, x1 = MX, x2 = MX + CW, w = 0.5, c = LBORD) =>
            doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).stroke(c);

        let y = MY;

        // ══════════════════════════════════════════════════════════════════════
        // 1. HEADER — Logo | Centro | Derecha
        // ══════════════════════════════════════════════════════════════════════

        const LOGO_W = 80;
        const LOGO_H = 72;
        const MID_X  = MX + LOGO_W + 12;
        const MID_W  = 200;
        const RIG_X  = MID_X + MID_W + 12;
        const RIG_W  = MX + CW - RIG_X;

        // Logo
        doc.circle(MX + 30, y + 28, 28).lineWidth(2).stroke('#6b7280');
        doc.font('Helvetica-Bold').fontSize(26).fillColor('#374151')
           .text('S', MX + 17, y + 16, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#374151')
           .text('Saher', MX + 4, y + 48, { width: LOGO_W, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(6.5).fillColor(GR)
           .text('Distribuidora Farmacéutica', MX, y + 62, { width: LOGO_W + 6, align: 'center', lineBreak: false });

        // Columna central — info del documento
        const infoRow = (label: string, val: string, iy: number) => {
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GR)
               .text(label, MID_X, iy, { lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(val, MID_X, iy + 9, { width: MID_W - 4, lineBreak: false });
        };

        infoRow('Tipo de Comprobante',    'TRASLADO DE MERCANCÍA',              y);
        infoRow('Pedido',                 datos.cod_int_pedido,                 y + 20);
        infoRow('Agente',                 datos.nombre_agente ?? '—',           y + 40);
        infoRow('ID Sistema Anterior',    `#${datos.id_empresa_sys_anterior}`,  y + 60);

        // Columna derecha — folio y fecha
        const infoRowR = (label: string, val: string, iy: number) => {
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GR)
               .text(label, RIG_X, iy, { lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(val, RIG_X, iy + 9, { width: RIG_W, lineBreak: false });
        };

        infoRowR('Folio',             String(datos.folio),    y);
        infoRowR('Lugar de Expedición', 'Culiacán, Sinaloa.', y + 20);
        infoRowR('Fecha de Emisión',  datos.fecha_emision,    y + 40);

        // Título grande centrado
        doc.font('Helvetica-Bold').fontSize(11).fillColor(AZUL)
           .text('TRASLADO DE MERCANCÍA', MX, y + 4, { width: CW, align: 'center', lineBreak: false });

        y += LOGO_H + 8;
        hline(y, MX, MX + CW, 1, '#9ca3af');
        y += 8;

        // ══════════════════════════════════════════════════════════════════════
        // 2. EMISOR / RECEPTOR
        // ══════════════════════════════════════════════════════════════════════

        const COL2 = CW / 2 - 4;
        const R_X  = MX + COL2 + 8;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
           .text('Emisor', MX, y);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
           .text('Receptor', R_X, y);
        y += 12;

        const emisorLines = [
            datos.nom_empre.toUpperCase(),
            datos.rfc_empre,
            'PASTOR ROUIX #2314 B',
            'INDUSTRIAL EL PALMITO',
            'C.P.  80160',
            'CULIACÁN, SINALOA',
        ];

        const startY = y;
        emisorLines.forEach(line => {
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(line, MX, y, { width: COL2, lineBreak: false });
            y += 9;
        });

        const receptorLines = [
            datos.razon_social.toUpperCase(),
            datos.rfc_receptor,
            datos.calle_receptor.toUpperCase(),
            datos.colonia_receptor.toUpperCase(),
            `${datos.municipio_receptor.toUpperCase()}, ${datos.estado_receptor.toUpperCase()}`,
        ].filter(l => l.trim() !== '');

        let ry = startY;
        receptorLines.forEach(line => {
            doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
               .text(line, R_X, ry, { width: COL2, lineBreak: false });
            ry += 9;
        });

        y = Math.max(y, ry) + 10;
        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 6;

        // ══════════════════════════════════════════════════════════════════════
        // 3. TABLA DE ARTÍCULOS
        // Cantidad(55) | Unidad(44) | C.Barras(108) | Descripción(215) | PrecioU(67) | Importe(67)
        // ══════════════════════════════════════════════════════════════════════

        const COLS = [
            { label: 'Cantidad',    w:  55, align: 'right'  as const },
            { label: 'Unidad',      w:  44, align: 'center' as const },
            { label: 'C. Barras',   w: 108, align: 'left'   as const },
            { label: 'Descripción', w: 215, align: 'left'   as const },
            { label: 'Precio U.',   w:  67, align: 'right'  as const },
            { label: 'Importe',     w:  67, align: 'right'  as const },
        ];

        const TH = 14;
        const TR = 13;

        hline(y, MX, MX + CW, 0.5, LBORD);
        let cx = MX;
        COLS.forEach(col => {
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
               .text(col.label, cx + 4, y + 3, { width: col.w - 8, align: col.align, lineBreak: false });
            cx += col.w;
        });
        y += TH;
        hline(y, MX, MX + CW, 0.5, LBORD);

        let totalPiezas = 0;
        datos.items.forEach((item, idx) => {
            totalPiezas += item.cantidad;
            if (idx % 2 === 1) {
                doc.rect(MX, y, CW, TR).fill('#f9fafb');
            }
            const importe = +(item.subtotal_linea * (1 + item.tasa_iva)).toFixed(2);
            const vals = [
                item.cantidad.toFixed(4),
                (item.unidad ?? '').substring(0, 6).toUpperCase(),
                item.cod_barras ?? '',
                item.descripcion,
                fmt2(item.precio_unitario),
                fmt2(importe),
            ];
            cx = MX;
            COLS.forEach((col, ci) => {
                doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
                   .text(vals[ci], cx + 4, y + 3,
                         { width: col.w - 8, align: col.align, lineBreak: false, ellipsis: true });
                cx += col.w;
            });
            y += TR;
        });

        const blanks = Math.max(3, 8 - datos.items.length);
        for (let i = 0; i < blanks; i++) {
            if ((datos.items.length + i) % 2 === 1) {
                doc.rect(MX, y, CW, TR).fill('#f9fafb');
            }
            y += TR;
        }

        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 5;

        // ══════════════════════════════════════════════════════════════════════
        // 4. TOTALES
        // ══════════════════════════════════════════════════════════════════════

        doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
           .text('Total Piezas', MX + 60, y + 2, { lineBreak: false });
        doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
           .text(totalPiezas.toFixed(4), MX + 130, y + 2, { lineBreak: false });

        const TLBL_W = 70;
        const TVAL_W = 80;
        const TX     = MX + CW - TLBL_W - TVAL_W;

        const tasas    = [...new Set(datos.items.filter(d => d.tasa_iva > 0).map(d => d.tasa_iva))];
        const ivaLabel = tasas.length === 1 ? `IVA${(tasas[0] * 100).toFixed(0)}%` : 'IVA';

        const totRows = [
            { label: 'Subtotal:', value: fmt2(datos.subtotal) },
            { label: ivaLabel + ':', value: fmt2(datos.iva) },
            { label: 'Total:',    value: fmt2(datos.total) },
        ];

        totRows.forEach((row, i) => {
            const ty      = y + i * 13;
            const isTotal = i === 2;
            if (isTotal) {
                doc.rect(TX, ty, TLBL_W + TVAL_W, 13).fill('#f0f0f0');
            }
            doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
               .text(row.label, TX, ty + 3, { width: TLBL_W, align: 'right', lineBreak: false });
            doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
               .text(row.value, TX + TLBL_W + 4, ty + 3, { width: TVAL_W - 8, align: 'right', lineBreak: false });
        });

        y += totRows.length * 13 + 12;
        hline(y, MX, MX + CW, 0.5, LBORD);
        y += 8;

        // ══════════════════════════════════════════════════════════════════════
        // 5. NOTA INFORMATIVA
        // ══════════════════════════════════════════════════════════════════════

        doc.rect(MX, y, CW, 28).fill('#eff6ff');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(AZUL)
           .text('NOTA:', MX + 6, y + 5, { lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e40af')
           .text(
               'Este documento es un comprobante interno de traslado de mercancía entre empresas del mismo grupo. ' +
               'No constituye un CFDI timbrado ante el SAT.',
               MX + 40, y + 5, { width: CW - 50 },
           );

        y += 38;

        // ══════════════════════════════════════════════════════════════════════
        // 6. FIRMA
        // ══════════════════════════════════════════════════════════════════════

        const FW  = 160;
        const FX1 = MX + CW / 2 - FW - 20;
        const FX2 = MX + CW / 2 + 20;
        const FY  = y + 30;

        hline(FY, FX1, FX1 + FW, 0.5, '#9ca3af');
        hline(FY, FX2, FX2 + FW, 0.5, '#9ca3af');

        doc.font('Helvetica').fontSize(7.5).fillColor(GR)
           .text('Entregado por', FX1, FY + 3, { width: FW, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(GR)
           .text('Recibido por', FX2, FY + 3, { width: FW, align: 'center', lineBreak: false });

        doc.end();
    });
}
