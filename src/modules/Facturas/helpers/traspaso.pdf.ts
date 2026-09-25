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
    nom_empre:           string;
    rfc_empre:           string;
    calle_empre:         string | null;
    colonia_empre:       string | null;
    municipio_empre:     string | null;
    estado_empre:        string | null;
    cp_empre:            string | null;
    nom_empre_receptor:  string | null;
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

    // pdfkit no siempre respeta lineBreak:false + ellipsis con anchos angostos
    // (se ve texto partido en 2 líneas encimándose con el renglón de abajo).
    // Se trunca el texto a mano, midiendo con la fuente ya puesta en el doc.
    const truncar = (texto: string, maxWidth: number): string => {
        if (doc.widthOfString(texto) <= maxWidth) return texto;
        let t = texto;
        while (t.length > 1 && doc.widthOfString(t + '…') > maxWidth) t = t.slice(0, -1);
        return t + '…';
    };

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

    // Nombre de empresa receptora (sucursal del sistema)
    if (datos.nom_empre_receptor) {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(AZUL)
           .text(datos.nom_empre_receptor.toUpperCase(), MX, dy, { width: HALF, lineBreak: false });
        dy += 9;
    }

    [
        datos.calle_receptor                                          ? `${datos.calle_receptor.toUpperCase()}` : null,
        datos.colonia_receptor                                        ? `Colonia: ${datos.colonia_receptor.toUpperCase()}` : null,
        datos.municipio_receptor && datos.estado_receptor             ? `Ciudad: ${datos.municipio_receptor}, ${datos.estado_receptor}` : null,
        `RFC: ${datos.rfc_receptor}`,
        datos.telefono_receptor                                       ? `Tel: ${datos.telefono_receptor}` : null,
        datos.cp_receptor                                             ? `C.P. ${datos.cp_receptor}` : null,
    ].filter(Boolean).forEach(l => {
        doc.font('Helvetica').fontSize(7).fillColor(NEGRO).text(l as string, MX, dy, { width: HALF, lineBreak: false });
        dy += 9;
    });

    doc.font('Helvetica-Bold').fontSize(7).fillColor(GR).text('REMITENTE:', R_X, y);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text(datos.nom_empre.toUpperCase(), R_X, y + 9, { width: HALF });
    let ry = y + 9 + doc.heightOfString(datos.nom_empre.toUpperCase(), { width: HALF });

    [
        datos.calle_empre                                             ? `${datos.calle_empre.toUpperCase()}` : null,
        datos.colonia_empre                                           ? `Colonia: ${datos.colonia_empre.toUpperCase()}` : null,
        datos.municipio_empre && datos.estado_empre
            ? `Ciudad: ${datos.municipio_empre.toUpperCase()}, ${datos.estado_empre.toUpperCase()}`      : null,
        datos.cp_empre                                                ? `C.P. ${datos.cp_empre}` : null,
        `RFC: ${datos.rfc_empre}`,
    ].filter(Boolean).forEach(l => {
        doc.font('Helvetica').fontSize(7).fillColor(NEGRO).text(l as string, R_X, ry, { width: HALF, lineBreak: false });
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
    // Una fila por cada combinación artículo+lote (si un artículo no tiene
    // lotes registrados, se le pone una sola fila con lote/caducidad en blanco).
    // El tipo de reporte (Normales/Receta) ya se indica una sola vez en el
    // encabezado de la página y en el pie, así que no se repite por renglón.
    const COLS = [
        { label: 'Piezas',      w:  36, align: 'right'  as const },
        { label: 'Código',      w:  40, align: 'center' as const },
        { label: 'C.Barras',    w:  75, align: 'left'   as const },
        { label: 'Descripción', w: 155, align: 'left'   as const },
        { label: 'Lote',        w:  60, align: 'left'   as const },
        { label: 'Caducidad',   w:  48, align: 'center' as const },
        { label: 'Proveedor',   w:  90, align: 'left'   as const },
        { label: 'Factura',     w:  64, align: 'left'   as const },
    ];
    const TH = 16;
    const TR = 15;
    const TIPO_LABEL = datos.tipo_reporte === 'Receta' ? 'Receta' : 'Otros';

    const vlines = (yTop: number, yBottom: number) => {
        let vx = MX;
        COLS.forEach(col => {
            doc.moveTo(vx, yTop).lineTo(vx, yBottom).lineWidth(0.4).stroke(LBORD);
            vx += col.w;
        });
        doc.moveTo(vx, yTop).lineTo(vx, yBottom).lineWidth(0.4).stroke(LBORD);
    };

    const renderTableHeader = () => {
        doc.rect(MX, y, CW, TH).fill('#e5e7eb');
        let hx = MX;
        COLS.forEach(col => {
            doc.font('Helvetica-Bold').fontSize(7).fillColor(NEGRO)
               .text(col.label, hx + 3, y + 4, { width: col.w - 6, align: col.align, lineBreak: false });
            hx += col.w;
        });
        y += TH;
        hline(y, MX, MX + CW, 0.8, '#9ca3af');
    };

    renderTableHeader();

    const FOOTER_H = 35;
    const MAX_Y    = PH - FOOTER_H;

    const checkPageBreak = () => {
        if (y + TR > MAX_Y) {
            hline(y, MX, MX + CW, 0.8, '#9ca3af');
            doc.addPage({ size: 'LETTER', margin: 0 });
            y = MY;
            rowIdx = 0;
            renderTableHeader();
        }
    };

    const renderFila = (vals: string[], bold0 = false) => {
        checkPageBreak();
        if (rowIdx % 2 === 0) doc.rect(MX, y, CW, TR).fill('#f9fafb');
        let cx = MX;
        vals.forEach((val, ci) => {
            doc.font(bold0 && ci === 3 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(NEGRO);
            const disp = truncar(val, COLS[ci].w - 6);
            doc.text(disp, cx + 3, y + 4, { width: COLS[ci].w - 6, align: COLS[ci].align, lineBreak: false });
            cx += COLS[ci].w;
        });
        vlines(y, y + TR);
        y += TR;
        rowIdx++;
    };

    // Filas
    let rowIdx = 0;
    datos.items.forEach(item => {
        if (!item.lotes.length) {
            renderFila([
                item.cantidad.toFixed(0), String(item.cod_int_artic), item.cod_barras,
                item.descripcion, '—', '—', '—', '—',
            ], true);
            return;
        }
        item.lotes.forEach(lote => {
            renderFila([
                lote.cantidad.toFixed(0), String(item.cod_int_artic), item.cod_barras,
                item.descripcion, lote.lote, lote.fecha_venci,
                lote.nom_proveedor ?? '—', lote.folio_factura_proveedor ?? '—',
            ], true);
        });
    });

    hline(y, MX, MX + CW, 0.8, '#9ca3af');
    y += 5;

    const totalPiezas = datos.items.reduce(
        (s, i) => s + (i.lotes.length ? i.lotes.reduce((a, l) => a + l.cantidad, 0) : i.cantidad), 0);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text(`Total Piezas: ${totalPiezas.toFixed(0)}`, MX, y);

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
