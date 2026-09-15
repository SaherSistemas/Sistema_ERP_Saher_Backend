import PDFDocument from 'pdfkit';
import fs   from 'fs';
import path from 'path';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DetalleItem {
    descripcion_articulo: string;
    cantidad:             number;
    precio_unitario:      number;
    subtotal:             number;
    tasa_iva:             number;
    importe_iva:          number;
    cod_barras:           string;
    unidad:               string;
}

export interface DatosRemisionPDF {
    folio_remision:    number;
    fecha_emision:     string;   // DD/MM/YY
    dia_venc:          string;   // DD  — para el pagaré
    mes_venc:          string;   // MM
    anio_venc:         string;   // YYYY
    dias_credito:      number;
    subtotal_remision: number;
    iva_remision:      number;
    total_remision:    number;
    estatus_remision:  string;
    notas:             string | null;
    // Receptor
    razon_social_cliente: string;
    rfc_cliente:          string | null;
    calle_receptor:       string;
    colonia_receptor:     string;
    cp_receptor:          string;
    municipio_receptor:   string;
    estado_receptor:      string;
    // Agente / pedido
    cod_identi_agente: string;
    nombre_agente:     string | null;
    cod_int_pedido:    string | null;
    folio_factura:     string | null;
    // Artículos
    detalles: DetalleItem[];
}

// ─── Helpers numéricos ────────────────────────────────────────────────────────

const UNIDADES = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS',
    'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];
const DECENAS = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function enLetras(n: number): string {
    if (n === 0)   return 'CERO';
    if (n < 0)     return 'MENOS ' + enLetras(-n);
    if (n <= 20)   return UNIDADES[n];
    if (n < 30)    return 'VEINTI' + enLetras(n - 20).toLowerCase();
    if (n < 100) {
        const d = Math.floor(n / 10), u = n % 10;
        return DECENAS[d] + (u ? ' Y ' + UNIDADES[u] : '');
    }
    if (n === 100) return 'CIEN';
    if (n < 1000) {
        const c = Math.floor(n / 100), r = n % 100;
        return CENTENAS[c] + (r ? ' ' + enLetras(r) : '');
    }
    if (n < 2000)    return 'MIL' + (n % 1000 ? ' ' + enLetras(n % 1000) : '');
    if (n < 1000000) {
        const m = Math.floor(n / 1000), r = n % 1000;
        return enLetras(m) + ' MIL' + (r ? ' ' + enLetras(r) : '');
    }
    if (n < 2000000) return 'UN MILLÓN' + (n % 1000000 ? ' ' + enLetras(n % 1000000) : '');
    const m = Math.floor(n / 1000000), r = n % 1000000;
    return enLetras(m) + ' MILLONES' + (r ? ' ' + enLetras(r) : '');
}

function numeroALetras(n: number): string {
    const entero   = Math.floor(n);
    const centavos = Math.round((n - entero) * 100);
    return `${enLetras(entero)} PESOS ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

function fmt2(n: number): string {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Generador principal ──────────────────────────────────────────────────────

export function generarRemisionPDFBuffer(datos: DatosRemisionPDF): Promise<Buffer> {
    return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
        size: 'LETTER', margin: 0,
        info: { Title: `Remisión ${datos.folio_remision}` },
    });
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW  = 612;
    const MX  = 28;           // margen horizontal
    const MY  = 22;           // margen vertical top
    const CW  = PW - MX * 2; // 556 pts de contenido
    const GR  = '#888888';
    const NEGRO = '#1a1a1a';
    const LBORD = '#d1d5db';

    // Línea horizontal auxiliar
    const hline = (y: number, x1 = MX, x2 = MX + CW, w = 0.5, c = LBORD) =>
        doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).stroke(c);

    // Límite inferior real de la página (margen de 36pt) — nunca se checaba antes,
    // así que las filas de la tabla podían dibujarse fuera del área visible y,
    // en los bloques de texto largo (pagaré), pdfkit agregaba página sola pero el
    // código seguía sumando `y` a mano sin enterarse, dejando páginas casi en
    // blanco (cada elemento siguiente caía cada vez más "perdido").
    const PAGE_BOTTOM = 792 - 36;

    let y = MY;

    // ══════════════════════════════════════════════════════════════════════════
    // 1. HEADER — Logo | Info centro | Info derecha
    // ══════════════════════════════════════════════════════════════════════════
    // 5 filas de info × 19 pts = 95 pts → LOGO_H = 100 da margen suficiente

    const LOGO_W  = 85;
    const LOGO_H  = 100;
    const ROW_GAP = 19;           // separación entre filas de info
    const MID_X   = MX + LOGO_W + 10;
    const MID_W   = 190;
    const RIG_X   = MID_X + MID_W + 10;
    const RIG_W   = MX + CW - RIG_X;

    // — Logo —
    const logoRaw  = process.env.RUTA_LOGO_PDF;
    const logoPath = logoRaw ? path.resolve(process.cwd(), logoRaw) : null;
    if (logoPath && fs.existsSync(logoPath)) {
        doc.image(logoPath, MX, y, { fit: [LOGO_W, LOGO_H] });
    } else {
        // Fallback: círculo con texto
        doc.circle(MX + 32, y + 34, 30).lineWidth(2).stroke('#6b7280');
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#374151')
           .text('S', MX + 19, y + 20, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#374151')
           .text('Saher', MX + 4, y + 54, { width: LOGO_W, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(6.5).fillColor(GR)
           .text('Distribuidora Farmacéutica', MX, y + 68, { width: LOGO_W + 4, align: 'center', lineBreak: false });
    }

    // — Columna central: label arriba, valor debajo, 19pts por fila —
    const infoRow = (label: string, val: string, row: number, ix = MID_X, w = MID_W) => {
        const iy = y + row * ROW_GAP;
        doc.font('Helvetica-Bold').fontSize(7).fillColor(GR)
           .text(label, ix, iy, { width: w, lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
           .text(val, ix, iy + 9, { width: w, lineBreak: false });
    };

    infoRow('Folio Fiscal',        '—',         0);
    infoRow('Forma de Pago',       'NA',         1);
    infoRow('Metodo de Pago',      '99 Otros',   2);
    infoRow('Tipo de Comprobante', 'Remision',   3);

    // — Columna derecha —
    infoRow('Folio',                     String(datos.folio_remision), 0, RIG_X, RIG_W);
    infoRow('Lugar de Expedicion',       'Culiacan, Sinaloa.',         1, RIG_X, RIG_W);
    infoRow('Numero de Cuenta',          'No Identificado',            2, RIG_X, RIG_W);
    infoRow('Fecha de Emision/Timbrado', datos.fecha_emision,          3, RIG_X, RIG_W);

    // — Fila 4: caja "Pedido" centrada, en la fila 4 del header —
    if (datos.cod_int_pedido) {
        const PED_W = 170;
        const PED_H = 18;
        const PED_Y = y + 4 * ROW_GAP;                          // fila 4
        const PED_X = MX + CW / 2 - PED_W / 2;
        doc.rect(PED_X, PED_Y, PED_W, PED_H).lineWidth(1.2).stroke('#374151');
        doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
           .text('Pedido:', PED_X + 6, PED_Y + 3, { width: 46, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1d4ed8')
           .text(datos.cod_int_pedido, PED_X + 54, PED_Y + 2, { width: PED_W - 60, lineBreak: false });
    }

    y += LOGO_H + 8;
    hline(y, MX, MX + CW, 1, '#9ca3af');
    y += 8;

    // ══════════════════════════════════════════════════════════════════════════
    // 2. EMISOR / RECEPTOR
    // ══════════════════════════════════════════════════════════════════════════

    const COL2 = CW / 2 - 4;
    const R_X  = MX + COL2 + 8;

    // Etiquetas
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text('Emisor', MX, y);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text('Receptor', R_X, y);
    y += 12;

    // Emisor (datos fijos de la empresa)
    const emisorLines = [
        'FARMACIAS SAHER DE SINALOA S DE RL DE CV',
        'FSS2311077F4',
        'PASTOR ROUIX #2314 B',
        'Numero Ext.__   Numero Int.__',
        'INDUSTRIAL EL PALMITO',
        'C.P.  80160',
        'CULIACAN',
        'SINALOA',
    ];
    emisorLines.forEach(line => {
        doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
           .text(line, MX, y, { width: COL2, lineBreak: false });
        y += 10;
    });

    // Receptor (datos del cliente)
    let ry = y - emisorLines.length * 10;
    const receptorLines = [
        datos.razon_social_cliente.toUpperCase(),
        datos.rfc_cliente ?? '',
        datos.calle_receptor.toUpperCase(),
        'Numero Ext.__   Numero Int.__',
        datos.colonia_receptor.toUpperCase(),
        datos.cp_receptor ? `C.P.  ${datos.cp_receptor}` : '',
        datos.municipio_receptor.toUpperCase(),
        `· ${datos.estado_receptor}`,
    ].filter(l => l !== '');

    receptorLines.forEach(line => {
        doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
           .text(line, R_X, ry, { width: COL2, lineBreak: false });
        ry += 10;
    });

    y = Math.max(y, ry) + 10;
    hline(y, MX, MX + CW, 0.5, LBORD);
    y += 6;

    // ══════════════════════════════════════════════════════════════════════════
    // 3. TABLA DE ARTÍCULOS
    // ══════════════════════════════════════════════════════════════════════════
    // Columnas (suma = CW = 556):
    // Cantidad(48) | Unidad(36) | C.Barras(82) | Descripcion(258) | PrecioU(66) | Importe(66)

    const COLS = [
        { label: 'Cantidad',    w:  48, align: 'right'  as const },
        { label: 'unidad',      w:  36, align: 'center' as const },
        { label: 'C Barras',    w:  82, align: 'left'   as const },
        { label: 'Descripcion', w: 258, align: 'left'   as const },
        { label: 'Precio U.',   w:  66, align: 'right'  as const },
        { label: 'Importe',     w:  66, align: 'right'  as const },
    ];

    const TH = 14;  // altura header
    const TR = 13;  // altura row

    // — Header (función reutilizable: se vuelve a dibujar en cada página nueva
    // que abra la tabla, para que un salto de página no deje una hoja "huérfana"
    // sin encabezado de columnas) —
    const drawTableHeader = () => {
        hline(y, MX, MX + CW, 0.5, LBORD);
        let hx = MX;
        COLS.forEach(col => {
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
               .text(col.label, hx + 4, y + 3, { width: col.w - 8, align: col.align, lineBreak: false });
            hx += col.w;
        });
        y += TH;
        hline(y, MX, MX + CW, 0.5, LBORD);
    };

    // Antes de dibujar un bloque de `neededHeight` pts, si no cabe en lo que
    // resta de la página, agrega una página nueva y reposiciona `y`. Si
    // `dentroDeTabla` es true, vuelve a dibujar el encabezado de columnas.
    const ensureSpace = (neededHeight: number, dentroDeTabla = false) => {
        if (y + neededHeight > PAGE_BOTTOM) {
            doc.addPage();
            y = MY;
            if (dentroDeTabla) drawTableHeader();
        }
    };

    drawTableHeader();

    // — Filas —
    let totalPiezas = 0;
    let cx = MX;
    datos.detalles.forEach((d, idx) => {
        totalPiezas += d.cantidad;
        ensureSpace(TR, true);
        if (idx % 2 === 1) {
            doc.rect(MX, y, CW, TR).fill('#f9fafb');
        }

        const vals = [
            d.cantidad.toFixed(4),
            d.unidad.substring(0, 6).toUpperCase(),
            d.cod_barras,
            d.descripcion_articulo,
            fmt2(d.precio_unitario),
            fmt2(d.subtotal + d.importe_iva),
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

    // Filas vacías (mínimo 3 filas vacías)
    const blanks = Math.max(3, 8 - datos.detalles.length);
    for (let i = 0; i < blanks; i++) {
        ensureSpace(TR, true);
        if ((datos.detalles.length + i) % 2 === 1) {
            doc.rect(MX, y, CW, TR).fill('#f9fafb');
        }
        y += TR;
    }

    hline(y, MX, MX + CW, 0.5, LBORD);
    y += 5;

    // ══════════════════════════════════════════════════════════════════════════
    // 4. TOTALES
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(13 * 3 + 15);

    // Total Piezas (izquierda)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO)
       .text(`Total Piezas`, MX + 60, y + 2, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
       .text(totalPiezas.toFixed(4), MX + 130, y + 2, { lineBreak: false });

    // Subtotal / IVA / Total (derecha)
    const TLBL_W = 70;
    const TVAL_W = 80;
    const TX = MX + CW - TLBL_W - TVAL_W;

    // IVA label dinámico
    const tasas = [...new Set(datos.detalles.filter(d => d.tasa_iva > 0).map(d => d.tasa_iva))];
    const ivaLabel = tasas.length === 1
        ? `IVA${(tasas[0] * 100).toFixed(0)}%`
        : 'IVA';

    const totRows = [
        { label: 'Subtotal:', value: fmt2(datos.subtotal_remision) },
        { label: ivaLabel + ':', value: fmt2(datos.iva_remision) },
        { label: 'Totales',    value: fmt2(datos.total_remision) },
    ];

    totRows.forEach((row, i) => {
        const ty = y + i * 13;
        const isTotal = i === 2;
        if (isTotal) {
            doc.rect(TX, ty, TLBL_W + TVAL_W, 13).fill('#f0f0f0');
        }
        doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
           .text(row.label, TX, ty + 3, { width: TLBL_W, align: 'right', lineBreak: false });
        doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NEGRO)
           .text(row.value, TX + TLBL_W + 4, ty + 3, { width: TVAL_W - 8, align: 'right', lineBreak: false });
    });

    y += totRows.length * 13 + 10;
    hline(y, MX, MX + CW, 0.5, LBORD);
    y += 6;

    // ══════════════════════════════════════════════════════════════════════════
    // 5. SON (cantidad con letra)
    // ══════════════════════════════════════════════════════════════════════════

    const sonTxt = `Son:( ${numeroALetras(datos.total_remision)} )`;
    ensureSpace(doc.heightOfString(sonTxt, { width: CW }) + 22);
    doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
       .text(sonTxt, MX, y, { width: CW });
    y += 22;

    // ══════════════════════════════════════════════════════════════════════════
    // 6. PAGARÉ
    // ══════════════════════════════════════════════════════════════════════════

    const pagare =
        `DEBO(EMOS) Y PAGARE(MOS) INCONDICIONALMENTE POR ESTE PAGARÉ A LA ORDEN DE ` +
        `FARMACIAS SAHER DE SINALOA S DE RL DE CV EN CULIACAN, SINALOA EL DIA ${datos.dia_venc} ` +
        `DE MES ${datos.mes_venc} DE AÑO ${datos.anio_venc} LA CANTIDAD DE ` +
        `${fmt2(datos.total_remision)} ( ${numeroALetras(datos.total_remision)} ) ` +
        `VALOR RECIBIDO A MI (NUESTRA) ENTERA SATISFACCION DE NO PAGARSE A SU VENCIMIENTO, ` +
        `ESTE DOCUMENTO HASTA EL DIA DE SU LIQUIDACION CAUSARA INTERESES MORATORIOS AL TIPO DE ` +
        `___% MENSUAL PAGADERO EN CULIACAN, SINALOA JUNTAMENTE CON EL PRINCIPAL. ` +
        `ARTICULO 170 DE LA LEY GENERAL DE TITULOS Y OPERACIONES DE CREDITO.`;

    const pagareH = doc.heightOfString(pagare, { width: CW });
    // Antes de dibujar, asegura que el párrafo completo quepa en lo que resta
    // de la página — así pdfkit ya no tiene que partirlo solo a media frase.
    ensureSpace(pagareH + 14);
    doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
       .text(pagare, MX, y, { width: CW, align: 'justify' });

    // Se sincroniza con doc.y (la posición real que dejó pdfkit) en vez de
    // sumar `y += pagareH` a ciegas — por si, aun así, alguna vez no cupiera
    // y pdfkit tuviera que agregar página por su cuenta, `y` no se desincroniza
    // del resto del documento (que fue justo el bug original: cada bloque
    // siguiente terminaba en su propia página casi vacía).
    y = doc.y + 14;

    // ══════════════════════════════════════════════════════════════════════════
    // 7. DEUDOR
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(11 + 12);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NEGRO)
       .text('DEUDOR:', MX, y);
    doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO)
       .text(datos.razon_social_cliente.toUpperCase(), MX, y + 11);

    doc.end();
    }); // Promise
}
