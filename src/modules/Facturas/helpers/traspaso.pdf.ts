import PDFDocument from 'pdfkit';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TraspasoItem {
    descripcion:             string;
    cantidad:                number;
    cod_int_artic:           number;
    cod_barras:              string;
    necesita_receta:         boolean;
    lotes: {
        lote:                    string;
        fecha_venci:             string;
        cantidad:                number;
        folio_factura_proveedor: string | null;
        nom_proveedor:           string | null;
    }[];
}

export interface DatosTraspasoDocPDF {
    folio:              number;
    folio_interno:      number;
    fecha:              string;
    cod_int_pedido:     string;
    ruta:               number | null;
    razon_social:       string;
    rfc_receptor:       string;
    calle_receptor:     string;
    colonia_receptor:   string;
    municipio_receptor: string;
    estado_receptor:    string;
    cp_receptor:        string;
    telefono_receptor:  string | null;
    nom_empre:          string;
    rfc_empre:          string;
    items:              TraspasoItem[];
    tipo_reporte:       'Normales' | 'Receta';
    pagina:             number;
    total_paginas:      number;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const PW    = 612;
const PH    = 792;
const MX    = 22;
const MY    = 18;
const CW    = PW - MX * 2;
const NEGRO = '#1a1a1a';
const GR    = '#6b7280';
const LBORD = '#d1d5db';
const AZUL  = '#1d4ed8';

// ─── Render de una página sobre un doc existente ──────────────────────────────

function _renderPaginaTraspaso(doc: InstanceType<typeof PDFDocument>, datos: DatosTraspasoDocPDF): void {

    const hline = (y: number, x1 = MX, x2 = MX + CW, w = 0.4, c = LBORD) =>
        doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).stroke(c);

    let y = MY;

    // ── 1. Título ─────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(13).fillColor(AZUL)
       .text('TRASPASO DE MEDICAMENTOS', MX, y, { width: CW, align: 'center' });
    y += 16;
    hline(y, MX, MX + CW, 1, AZUL);
    y += 5;

    // ── 2. Destinatario | Remitente ───────────────────────────────────────────
    const HALF = CW / 2 - 4;
    const R_X  = MX + HALF + 8;

    doc.font('Helvetica-Bold').fontSize(7).fillColor(GR).text('DESTINATARIO:', MX, y);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text(datos.razon_social.toUpperCase(), MX, y + 9, { width: HALF });
    let dy = y + 9 + doc.heightOfString(datos.razon_social.toUpperCase(), { width: HALF });

    [
        `AV. ${datos.calle_receptor.toUpperCase()}`,
        `Colonia: ${datos.colonia_receptor.toUpperCase()}`,
        `Ciudad: ${datos.municipio_receptor}, ${datos.estado_receptor}`,
        `RFC: ${datos.rfc_receptor}`,
        datos.telefono_receptor ? `Teléfono: ${datos.telefono_receptor}` : '',
        datos.cp_receptor       ? `C.P. ${datos.cp_receptor}` : '',
    ].filter(Boolean).forEach(l => {
        doc.font('Helvetica').fontSize(7).fillColor(NEGRO).text(l, MX, dy, { width: HALF, lineBreak: false });
        dy += 9;
    });

    doc.font('Helvetica-Bold').fontSize(7).fillColor(GR).text('REMITENTE:', R_X, y);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text(datos.nom_empre.toUpperCase(), R_X, y + 9, { width: HALF });
    let ry = y + 9 + doc.heightOfString(datos.nom_empre.toUpperCase(), { width: HALF });

    ['INDUSTRIAL EL PALMITO', 'PASTOR ROUIX #2314 B', `RFC: ${datos.rfc_empre}`]
    .forEach(l => {
        doc.font('Helvetica').fontSize(7).fillColor(NEGRO).text(l, R_X, ry, { width: HALF, lineBreak: false });
        ry += 9;
    });

    y = Math.max(dy, ry) + 6;
    hline(y, MX, MX + CW, 0.5, LBORD);
    y += 4;

    // ── 3. Fila de metadatos ──────────────────────────────────────────────────
    const META = [
        { label: 'C.P.',       val: datos.cp_receptor || '—',   w: 55 },
        { label: '# Ped:',     val: datos.cod_int_pedido,        w: 90 },
        { label: 'Ruta:',      val: String(datos.ruta ?? '—'),   w: 50 },
        { label: 'F. Digital', val: String(datos.folio),         w: 70 },
        { label: 'F. Interno', val: String(datos.folio_interno), w: 70 },
        { label: 'FECHA',      val: datos.fecha,                 w: 70 },
    ];
    let mx = MX;
    META.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(GR)
           .text(col.label, mx, y, { width: col.w, lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
           .text(col.val, mx, y + 8, { width: col.w, lineBreak: false });
        mx += col.w;
    });
    y += 20;
    hline(y, MX, MX + CW, 0.8, '#9ca3af');
    y += 4;

    // ── 4. Tabla ──────────────────────────────────────────────────────────────
    const COLS = [
        { label: 'Piezas',      w:  40, align: 'right'  as const },
        { label: 'Lote',        w:  65, align: 'left'   as const },
        { label: 'Caducidad',   w:  52, align: 'center' as const },
        { label: 'Factura',     w:  80, align: 'left'   as const },
        { label: 'Origen',      w: 118, align: 'left'   as const },
        { label: 'Código',      w:  42, align: 'center' as const },
        { label: 'C.Barras',    w:  72, align: 'left'   as const },
        { label: 'Descripción', w:  59, align: 'left'   as const },
        { label: 'Tipo',        w:  38, align: 'center' as const },
    ];
    const TH         = 13;
    const TR         = 12;
    const TIPO_LABEL = datos.tipo_reporte === 'Receta' ? 'Receta' : 'Otros';

    // Header
    doc.rect(MX, y, CW, TH).fill('#e5e7eb');
    let cx = MX;
    COLS.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(NEGRO)
           .text(col.label, cx + 2, y + 3, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
    });
    y += TH;
    hline(y);

    // Filas
    let rowIdx = 0;
    datos.items.forEach(item => {
        if (rowIdx % 2 === 0) doc.rect(MX, y, CW, TR).fill('#f9fafb');
        cx = MX;
        ['', '', '', '', '', String(item.cod_int_artic), item.cod_barras, item.descripcion, TIPO_LABEL]
        .forEach((val, ci) => {
            doc.font(ci === 7 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(NEGRO)
               .text(val, cx + 2, y + 3,
                     { width: COLS[ci].w - 4, align: COLS[ci].align, lineBreak: false, ellipsis: true });
            cx += COLS[ci].w;
        });
        y += TR;
        rowIdx++;

        item.lotes.forEach(lote => {
            if (rowIdx % 2 === 0) doc.rect(MX, y, CW, TR).fill('#f9fafb');
            cx = MX;
            [lote.cantidad.toFixed(4), lote.lote, lote.fecha_venci,
             lote.folio_factura_proveedor ?? '', lote.nom_proveedor ?? '',
             '', '', '', '']
            .forEach((val, ci) => {
                doc.font('Helvetica').fontSize(6.5).fillColor(ci === 0 ? NEGRO : GR)
                   .text(val, cx + 2, y + 3,
                         { width: COLS[ci].w - 4, align: COLS[ci].align, lineBreak: false, ellipsis: true });
                cx += COLS[ci].w;
            });
            y += TR;
            rowIdx++;
        });
    });

    hline(y, MX, MX + CW, 0.8, '#9ca3af');
    y += 5;

    const totalPiezas = datos.items.reduce((s, i) => s + i.lotes.reduce((a, l) => a + l.cantidad, 0), 0);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
       .text(`Total Piezas: ${totalPiezas.toFixed(4)}`, MX, y);

    // ── 5. Footer ─────────────────────────────────────────────────────────────
    const FY = PH - 30;
    hline(FY, MX, MX + CW, 0.5, LBORD);
    doc.font('Helvetica').fontSize(7).fillColor(GR)
       .text(`Tipo Reporte: ${TIPO_LABEL}`, MX, FY + 4, { lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(GR)
       .text(`Pag. ${datos.pagina} de ${datos.total_paginas}`, MX, FY + 4,
             { width: CW, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7).fillColor(NEGRO)
       .text('FARMACIAS SAHER CULIACÁN', MX, FY + 4, { width: CW, align: 'right', lineBreak: false });
}

// ─── Generador: normales + receta en UN SOLO PDF (multi-página) ───────────────

export function generarTraspasoCompletoPDFBuffer(
    base: Omit<DatosTraspasoDocPDF, 'items' | 'tipo_reporte' | 'pagina' | 'total_paginas'>,
    todos: TraspasoItem[],
): Promise<Buffer> {

    const normales = todos.filter(i => !i.necesita_receta);
    const receta   = todos.filter(i =>  i.necesita_receta);
    const total    = (normales.length ? 1 : 0) + (receta.length ? 1 : 0);

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false,
            info: { Title: `Traspaso ${base.folio}` } });
        doc.on('data',  (c: Buffer) => chunks.push(c));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let pag = 1;
        if (normales.length) {
            doc.addPage({ size: 'LETTER', margin: 0 });
            _renderPaginaTraspaso(doc, { ...base, items: normales, tipo_reporte: 'Normales', pagina: pag++, total_paginas: total });
        }
        if (receta.length) {
            doc.addPage({ size: 'LETTER', margin: 0 });
            _renderPaginaTraspaso(doc, { ...base, items: receta, tipo_reporte: 'Receta', pagina: pag, total_paginas: total });
        }

        doc.end();
    });
}
