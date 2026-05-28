import PDFDocument from 'pdfkit';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AbonoRecibo {
    folio_documento:       string;   // folio de factura o remisión
    valor_documento:       number;   // monto_total de la CxC
    id_forma_pago:         string;   // '01'=efectivo, '02'=cheque, '03'=transferencia...
    referencia_pago:       string | null;  // número de cheque / transferencia
    fecha_deposito:        string;   // ISO date
    monto:                 number;   // monto_pago
}

export interface DatosRecibo {
    numero_recibo:    string;
    fecha_emision:    string;          // fecha del pago (ISO)
    razon_social:     string;
    nombre_cliente:   string;
    ciudad:           string;
    notas:            string | null;
    abonos:           AbonoRecibo[];
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function formatDate(d: string | Date): string {
    const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
    return dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMXN(n: number): string {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Número a letras (español) ────────────────────────────────────────────────

const UNIDADES = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS',
    'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];
const DECENAS   = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS  = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function enLetras(n: number): string {
    if (n === 0)    return 'CERO';
    if (n < 0)      return 'MENOS ' + enLetras(-n);
    if (n <= 20)    return UNIDADES[n];
    if (n < 30)     return 'VEINTI' + enLetras(n - 20).toLowerCase();
    if (n < 100) {
        const d = Math.floor(n / 10), u = n % 10;
        return DECENAS[d] + (u ? ' Y ' + UNIDADES[u] : '');
    }
    if (n === 100)    return 'CIEN';
    if (n < 1000) {
        const c = Math.floor(n / 100), r = n % 100;
        return CENTENAS[c] + (r ? ' ' + enLetras(r) : '');
    }
    if (n < 2000)     return 'MIL'           + (n % 1000 ? ' ' + enLetras(n % 1000) : '');
    if (n < 1000000) {
        const m = Math.floor(n / 1000), r = n % 1000;
        return enLetras(m) + ' MIL'          + (r ? ' ' + enLetras(r) : '');
    }
    if (n < 2000000)  return 'UN MILLÓN'     + (n % 1000000 ? ' ' + enLetras(n % 1000000) : '');
    const m = Math.floor(n / 1000000), r = n % 1000000;
    return enLetras(m) + ' MILLONES'         + (r ? ' ' + enLetras(r) : '');
}

export function numeroALetras(n: number): string {
    const entero    = Math.floor(n);
    const centavos  = Math.round((n - entero) * 100);
    return `${enLetras(entero)} PESOS ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

// ─── Generador principal ──────────────────────────────────────────────────────

export function generarReciboPDFBuffer(datos: DatosRecibo): Buffer {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, info: { Title: `Recibo ${datos.numero_recibo}` } });
    doc.on('data', (c: Buffer) => chunks.push(c));

    const PW = 612;
    const MX = 32;          // margen horizontal
    const CW = PW - MX * 2; // ancho del contenido = 548
    const AZUL   = '#1a3c6e';
    const ROJO   = '#cc1111';
    const GRIS_L = '#eeeeee';
    const GRIS_D = '#888888';
    const NEGRO  = '#111111';

    // Helper: celda con borde
    const cell = (x: number, y: number, w: number, h: number, text: string, opts?: {
        bold?: boolean; size?: number; color?: string; align?: 'left' | 'center' | 'right';
        bg?: string; paddingX?: number; paddingY?: number;
    }) => {
        const { bold = false, size = 8, color = NEGRO, align = 'left', bg, paddingX = 4, paddingY = 3 } = opts ?? {};
        if (bg) doc.rect(x, y, w, h).fill(bg);
        doc.rect(x, y, w, h).stroke('#bbbbbb');
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(size)
           .fillColor(color)
           .text(text, x + paddingX, y + paddingY, { width: w - paddingX * 2, align, lineBreak: false, ellipsis: true });
    };

    let y = MX;

    // ── ENCABEZADO ─────────────────────────────────────────────────────────────

    // Caja logo "S"
    const LOGO_SIZE = 64;
    doc.rect(MX, y, LOGO_SIZE, LOGO_SIZE).fillAndStroke(AZUL, AZUL);
    doc.font('Helvetica-Bold').fontSize(44).fillColor('#ffffff')
       .text('S', MX, y + 8, { width: LOGO_SIZE, align: 'center', lineBreak: false });

    // Nombre debajo del logo
    doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL)
       .text('Farmacias Saher', MX + LOGO_SIZE + 6, y + 4);
    doc.font('Helvetica').fontSize(7).fillColor(GRIS_D)
       .text('de Sinaloa', MX + LOGO_SIZE + 6, y + 16);

    // Datos de empresa (columna central)
    const EMP_X = MX + 155;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NEGRO)
       .text('FARMACIAS SAHER DE SINALOA S. DE R.L. DE C.V.', EMP_X, y + 2, { width: 260 });
    doc.font('Helvetica').fontSize(7).fillColor('#444444')
       .text('Calle Pastor Rouix 2314 Int. B Colonia Industrial El Palmito', EMP_X, y + 14, { width: 260 })
       .text('C.P. 80160, Culiacán, Sinaloa     RFC: FSS231107F4',            EMP_X, y + 23, { width: 260 })
       .text('Correo: farmacias.saher@gmail.com  Teléfono: 66 77 644798',      EMP_X, y + 32, { width: 260 });

    doc.font('Helvetica-Bold').fontSize(11).fillColor(AZUL)
       .text('RECIBO DE COBRANZA', EMP_X, y + 44, { width: 260 });

    // Número de recibo (caja roja, esquina derecha)
    const RB_W = 90; const RB_H = 26;
    const RB_X = MX + CW - RB_W; const RB_Y = y + 4;
    doc.rect(RB_X, RB_Y, RB_W, RB_H).fillAndStroke(ROJO, ROJO);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff')
       .text(`N° ${datos.numero_recibo}`, RB_X, RB_Y + 7, { width: RB_W, align: 'center', lineBreak: false });

    y += LOGO_SIZE + 8;

    // ── LÍNEA SEPARADORA ───────────────────────────────────────────────────────
    doc.rect(MX, y, CW, 1.5).fill(AZUL);
    y += 6;

    // ── DATOS DEL CLIENTE ──────────────────────────────────────────────────────
    const CH = 18; // altura de cada celda de info cliente

    // Fila 1: FECHA | RAZÓN SOCIAL
    const C1W = 110; const C2W = CW - C1W;
    cell(MX,        y, C1W, CH, 'FECHA:', { bold: true, size: 7.5, color: '#555' });
    doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO)
       .text(formatDate(datos.fecha_emision), MX + C1W - 78, y + 4, { lineBreak: false });

    cell(MX + C1W, y, C2W, CH, `RAZÓN SOCIAL:  ${datos.razon_social}`, { bold: false, size: 8.5 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('RAZÓN SOCIAL:', MX + C1W + 4, y + 4);
    y += CH;

    // Fila 2: NOMBRE | CIUDAD
    const C3W = 300; const C4W = CW - C3W;
    cell(MX,        y, C3W, CH, `NOMBRE:  ${datos.nombre_cliente}`,  { bold: false, size: 8.5 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555').text('NOMBRE:', MX + 4, y + 4);
    cell(MX + C3W, y, C4W, CH, `CIUDAD:  ${datos.ciudad}`, { bold: false, size: 8.5 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555').text('CIUDAD:', MX + C3W + 4, y + 4);
    y += CH;

    y += 4;

    // ── TABLA DE PAGOS ─────────────────────────────────────────────────────────
    // Definición de columnas (suma = 548)
    type ColDef = { label: string; w: number };
    const COLS: ColDef[] = [
        { label: 'FACT. NO.',   w: 75 },
        { label: 'VALOR',       w: 68 },
        { label: 'CHEQUE',      w: 60 },
        { label: 'BANCO',       w: 68 },
        { label: 'FECHA DEP.',  w: 72 },
        { label: 'EFECTIVO',    w: 65 },
        { label: 'MONTO TOTAL', w: 140 },
    ];

    const TH = 17; // altura del header de tabla
    const TR = 16; // altura de cada fila

    // Header
    let cx = MX;
    for (const col of COLS) {
        cell(cx, y, col.w, TH, col.label, { bold: true, size: 7.5, color: '#ffffff', align: 'center', bg: AZUL });
        cx += col.w;
    }
    y += TH;

    // Filas de abonos
    let totalMonto = 0;
    datos.abonos.forEach((ab, idx) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : GRIS_L;
        cx = MX;

        const esEfectivo     = ab.id_forma_pago === '01';
        const esCheque       = ab.id_forma_pago === '02';
        const esTrans        = !esEfectivo && !esCheque;

        const chequeVal   = esCheque ? formatMXN(ab.monto)             : '';
        const efectivoVal = esEfectivo ? formatMXN(ab.monto)           : '';
        const bancoVal    = (esCheque || esTrans) ? (ab.referencia_pago ?? '') : '';

        const vals = [
            ab.folio_documento,
            formatMXN(ab.valor_documento),
            chequeVal,
            bancoVal,
            formatDate(ab.fecha_deposito),
            efectivoVal,
            formatMXN(ab.monto),
        ];

        COLS.forEach((col, ci) => {
            const isNum = ci >= 1;
            cell(cx, y, col.w, TR, vals[ci], { size: 8, align: isNum ? 'right' : 'left', bg: rowBg });
            cx += col.w;
        });

        totalMonto += ab.monto;
        y += TR;
    });

    // Filas vacías (mínimo 5 filas en total, al menos 2 vacías)
    const minFilas = Math.max(5, datos.abonos.length + 2);
    const filasVacias = minFilas - datos.abonos.length;
    for (let i = 0; i < filasVacias; i++) {
        cx = MX;
        const rowBg = (datos.abonos.length + i) % 2 === 0 ? '#ffffff' : GRIS_L;
        COLS.forEach(col => {
            cell(cx, y, col.w, TR, '', { bg: rowBg });
            cx += col.w;
        });
        y += TR;
    }

    y += 6;

    // ── SECCIÓN INFERIOR ───────────────────────────────────────────────────────
    const BOTTOM_W_L  = CW * 0.60; // izquierda: observaciones
    const BOTTOM_W_R  = CW - BOTTOM_W_L; // derecha: totales

    // ──── Izquierda: observaciones y forma de pago ─────────────────────────────
    const OBS_H = 56;

    // Caja observaciones
    doc.rect(MX, y, BOTTOM_W_L, OBS_H).stroke('#bbbbbb');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('OBSERVACIONES (', MX + 4, y + 4, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
       .text(datos.notas ?? '', MX + 4, y + 14, { width: BOTTOM_W_L - 8, height: OBS_H - 20 });

    // Transferencia
    const transRef = datos.abonos.find(a => a.id_forma_pago === '03')?.referencia_pago ?? '';
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('TRANSFERENCIAS No.', MX + 4, y + OBS_H / 2 + 4, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
       .text(transRef, MX + 104, y + OBS_H / 2 + 4, { lineBreak: false });

    // Checkboxes
    const CHK_Y = y + OBS_H - 12;
    const checkboxes = ['DEVOLUCIÓN', 'PRONTO PAGO', 'OTROS'];
    let ckx = MX + 4;
    checkboxes.forEach(label => {
        doc.rect(ckx, CHK_Y, 8, 8).stroke('#888888');
        doc.font('Helvetica').fontSize(7).fillColor(NEGRO)
           .text(label, ckx + 10, CHK_Y + 1, { lineBreak: false });
        ckx += label.length * 4.5 + 18;
    });

    // ──── Derecha: subtotal, descuento, total ──────────────────────────────────
    const TR_H  = OBS_H / 3;
    const LBL_W = BOTTOM_W_R * 0.5;
    const VAL_W = BOTTOM_W_R - LBL_W;
    const rx     = MX + BOTTOM_W_L;

    const totalesRows = [
        { label: 'SUB TOTAL', value: formatMXN(totalMonto) },
        { label: 'DESC.',     value: '' },
        { label: 'TOTAL',     value: formatMXN(totalMonto) },
    ];
    totalesRows.forEach((row, i) => {
        const ry = y + i * TR_H;
        cell(rx,           ry, LBL_W, TR_H, row.label, { bold: true, size: 8, color: '#333', align: 'right', bg: i === 2 ? '#f0f0f0' : '#ffffff' });
        cell(rx + LBL_W,   ry, VAL_W, TR_H, row.value, { bold: i === 2, size: 8, align: 'right', bg: i === 2 ? '#f0f0f0' : '#ffffff' });
    });

    y += OBS_H + 8;

    // ── CANTIDAD CON LETRA ─────────────────────────────────────────────────────
    doc.rect(MX, y, CW, 17).stroke('#bbbbbb');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('CANTIDAD CON LETRA:', MX + 4, y + 5, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
       .text(numeroALetras(totalMonto), MX + 110, y + 5, { width: CW - 116, lineBreak: false, ellipsis: true });
    y += 17 + 16;

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    const FW = CW / 2 - 10;
    const FY_LINE = y + 28;

    // Vendedor
    doc.moveTo(MX, FY_LINE).lineTo(MX + FW, FY_LINE).stroke('#555555');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('NOMBRE Y FIRMA VENDEDOR', MX, FY_LINE + 4, { width: FW, align: 'center' });

    // Cliente
    const FC_X = MX + CW - FW;
    doc.moveTo(FC_X, FY_LINE).lineTo(MX + CW, FY_LINE).stroke('#555555');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555')
       .text('NOMBRE Y FIRMA CLIENTE', FC_X, FY_LINE + 4, { width: FW, align: 'center' });

    y = FY_LINE + 20;

    // ── NOTA LEGAL ────────────────────────────────────────────────────────────
    y += 8;
    doc.rect(MX, y, CW, 1).fill(GRIS_D);
    y += 4;
    doc.font('Helvetica').fontSize(6).fillColor(GRIS_D)
       .text(
           'NOTA: NO RECONOCEMOS NINGÚN PAGO REALIZADO A NUESTROS REPRESENTANTES SI NO CONSTA CON ESTE RECIBO DE COBRO FIRMADO POR NUESTRO REPRESENTANTE. ' +
           'LOS PAGOS SE ABONAN CON BUEN COBRO; EN CHEQUES DEVUELTOS SE COBRARÁ EL 20% (ARTÍCULO 193 DE LA LEY). ' +
           'SALVO BUEN COBRO; EN CHEQUES DEVUELTOS POR FALTA DE FONDOS SE COBRARÁ DE TÍTULO 1 OPERACIONES DE CRÉDITO.',
           MX, y, { width: CW }
       );
    y += 20;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#333')
       .text('FARMACIAS SYG S.A. DE C.V.', MX, y, { width: CW, align: 'center' });

    doc.end();
    return Buffer.concat(chunks);
}
