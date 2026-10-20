import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AbonoRecibo {
    folio_documento:       string;   // folio de factura o remisión
    valor_documento:       number;   // monto_total de la CxC
    id_forma_pago:         string;   // '01'=efectivo, '02'=cheque, '03'=transferencia...
    referencia_pago:       string | null;  // número de cheque / transferencia
    banco?:                string | null;  // banco del cheque / de la transferencia
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
    /** Firma del cliente capturada en el cobro (imagen en base64, con o sin prefijo data:) */
    firma_cliente?:   string | null;
    /** Nombre del agente que cobra (sale sobre la línea de NOMBRE Y FIRMA VENDEDOR) */
    nombre_vendedor?: string | null;
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
// Recibo de cobranza en HOJA CARTA HORIZONTAL, con el mismo formato del recibo impreso de Saher:
// logo y datos de la empresa, RECIBO DE COBRANZA con su número en rojo, datos del cliente, tabla de documentos
// (FACT. NO · VALOR · CHEQUE · BANCO · FECHA DEP. · EFECTIVO · MONTO TOTAL), observaciones, transferencia,
// devolución / pronto pago / otros, cantidad con letra, subtotal / descuento / total, firmas y nota legal.

// Logo: RUTA_LOGO_PDF si existe; si no, el que va en la carpeta assets del backend; si no, texto.
function rutaLogo(): string | null {
    const candidatos = [
        process.env.RUTA_LOGO_PDF ? path.resolve(process.cwd(), process.env.RUTA_LOGO_PDF) : null,
        path.resolve(process.cwd(), 'assets', 'logo_saher.png'),
        path.resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'logo_saher.png'),
    ].filter(Boolean) as string[];
    return candidatos.find(p => fs.existsSync(p)) ?? null;
}

export function generarReciboPDFBuffer(datos: DatosRecibo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
        size: 'LETTER', layout: 'landscape', margin: 0,
        info: { Title: `Recibo de cobranza ${datos.numero_recibo}` },
    });
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Hoja carta horizontal: 792 x 612 pt
    const PW = 792, PH = 612;
    const FM = 20;                  // margen del marco
    const MX = FM + 16;             // margen del contenido
    const CW = PW - MX * 2;         // ancho del contenido
    const AZUL  = '#2b3a8f';        // azul del formato impreso
    const AZUL_C = '#b9c0e4';       // azul claro del encabezado de tabla
    const ROJO  = '#d11a1a';
    const NEGRO = '#1a1a1a';

    // Marco redondeado de toda la hoja
    doc.roundedRect(FM, FM, PW - FM * 2, PH - FM * 2, 10).lineWidth(1.4).stroke(AZUL);

    // Texto de etiqueta (azul, negrita)
    const etiqueta = (t: string, x: number, y: number, size = 8, opts: any = {}) =>
        doc.font('Helvetica-Bold').fontSize(size).fillColor(AZUL).text(t, x, y, { lineBreak: false, ...opts });
    const valor = (t: string, x: number, y: number, w: number, size = 9) =>
        doc.font('Helvetica').fontSize(size).fillColor(NEGRO).text(t, x, y, { width: w, lineBreak: false, ellipsis: true });

    // ── ENCABEZADO ─────────────────────────────────────────────────────────────
    let y = FM + 12;
    const logo = rutaLogo();
    const LOGO_W = 150, LOGO_H = 52;
    if (logo) {
        doc.image(logo, MX, y, { fit: [LOGO_W, LOGO_H] });
    } else {
        doc.font('Helvetica-Bold').fontSize(30).fillColor(AZUL).text('Saher', MX, y + 8, { lineBreak: false });
    }

    // Datos de la empresa (a la derecha del logo, alineados a la derecha como en el formato)
    const EMP_W = 330;
    const EMP_X = MX + CW - EMP_W;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL)
       .text('FARMACIAS SAHER DE SINALOA S. DE R.L. DE C.V.', EMP_X, y, { width: EMP_W, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(AZUL)
       .text('Calle Pastor Rouix 2314 Int. B Colonia Industrial El Palmito.', EMP_X, y + 12, { width: EMP_W, align: 'right', lineBreak: false })
       .text('C.P. 80160, Culiacán, Sinaloa  RFC: FSS231107F4',              EMP_X, y + 22, { width: EMP_W, align: 'right', lineBreak: false })
       .text('Correo: farmacias.saher@gmail.com  Teléfono: 66 77 644798',   EMP_X, y + 32, { width: EMP_W, align: 'right', lineBreak: false });

    // RECIBO DE COBRANZA + Nº en rojo (caja redondeada)
    const NB_W = 150, NB_H = 24;
    const NB_X = MX + CW - NB_W, NB_Y = y + 48;
    doc.roundedRect(NB_X, NB_Y, NB_W, NB_H, 5).lineWidth(1.2).stroke(AZUL);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL).text('Nº', NB_X + 8, NB_Y + 8, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(ROJO)
       .text(String(datos.numero_recibo), NB_X + 24, NB_Y + 4, { width: NB_W - 30, align: 'center', lineBreak: false, ellipsis: true });
    etiqueta('RECIBO DE COBRANZA', NB_X - 175, NB_Y + 6, 12, { width: 168, align: 'right' });

    // ── DATOS DEL CLIENTE (cuatro renglones, como en el formato) ───────────────
    y = FM + 12 + 78;
    const FW_ = 400;            // ancho de la caja de datos
    const FH = 17;
    doc.roundedRect(MX, y, FW_, FH * 4 + 4, 6).lineWidth(1).stroke(AZUL);
    const campos: [string, string][] = [
        ['FECHA:',        formatDate(datos.fecha_emision)],
        ['RAZÓN SOCIAL:', datos.razon_social],
        ['NOMBRE:',       datos.nombre_cliente],
        ['CIUDAD:',       datos.ciudad],
    ];
    campos.forEach(([lbl, val], i) => {
        const ry = y + 3 + i * FH;
        if (i > 0) doc.moveTo(MX + 4, ry).lineTo(MX + FW_ - 4, ry).lineWidth(0.5).stroke(AZUL_C);
        etiqueta(lbl, MX + 8, ry + 5, 8);
        valor(val ?? '', MX + 92, ry + 4, FW_ - 100, 9);
    });

    // ── TABLA DE DOCUMENTOS ────────────────────────────────────────────────────
    y += FH * 4 + 4 + 10;
    type ColDef = { label: string; w: number };
    const COLS: ColDef[] = [
        { label: 'FACT. NO.',   w: 92 },
        { label: 'VALOR',       w: 96 },
        { label: 'CHEQUE',      w: 92 },
        { label: 'BANCO',       w: 112 },
        { label: 'FECHA DEP.',  w: 96 },
        { label: 'EFECTIVO',    w: 100 },
        { label: 'MONTO TOTAL', w: CW - (92 + 96 + 92 + 112 + 96 + 100) },
    ];
    const TH = 19, TR = 15.5;
    const FILAS = Math.max(12, datos.abonos.length);   // al menos 12 renglones, como la hoja impresa
    const tablaTop = y;
    const tablaH = TH + TR * FILAS;

    // Encabezado azul claro
    doc.rect(MX, y, CW, TH).fill(AZUL_C);
    let cx = MX;
    for (const col of COLS) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(AZUL)
           .text(col.label, cx, y + 6, { width: col.w, align: 'center', lineBreak: false });
        cx += col.w;
    }
    y += TH;

    // Renglones
    let totalMonto = 0;
    for (let i = 0; i < FILAS; i++) {
        const ab = datos.abonos[i];
        if (ab) {
            const esEfectivo = ab.id_forma_pago === '01';
            const esCheque   = ab.id_forma_pago === '02';
            const esTrans    = !esEfectivo && !esCheque;
            const vals = [
                ab.folio_documento,
                formatMXN(ab.valor_documento),
                esCheque ? formatMXN(ab.monto) : '',
                (esCheque || esTrans) ? (ab.banco || ab.referencia_pago || '') : '',
                formatDate(ab.fecha_deposito),
                esEfectivo ? formatMXN(ab.monto) : '',
                formatMXN(ab.monto),
            ];
            cx = MX;
            COLS.forEach((col, ci) => {
                const num = ci === 1 || ci === 2 || ci === 5 || ci === 6;
                doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO)
                   .text(vals[ci], cx + 4, y + 4, { width: col.w - 8, align: ci === 0 || ci === 3 ? 'left' : (num ? 'right' : 'center'), lineBreak: false, ellipsis: true });
                cx += col.w;
            });
            totalMonto += ab.monto;
        }
        // línea horizontal del renglón
        doc.moveTo(MX, y + TR).lineTo(MX + CW, y + TR).lineWidth(0.5).stroke(AZUL);
        y += TR;
    }

    // Marco de la tabla y líneas verticales
    doc.rect(MX, tablaTop, CW, tablaH).lineWidth(1).stroke(AZUL);
    cx = MX;
    for (let i = 0; i < COLS.length - 1; i++) {
        cx += COLS[i].w;
        doc.moveTo(cx, tablaTop).lineTo(cx, tablaTop + tablaH).lineWidth(0.5).stroke(AZUL);
    }

    // ── PARTE INFERIOR ─────────────────────────────────────────────────────────
    y += 10;
    const IZQ_W = CW - 200;       // izquierda: observaciones, transferencia, etc.
    const TOT_W = 190;            // derecha: subtotal / descuento / total
    const BAJO_Y = y;

    // Observaciones ( ... )
    etiqueta('OBSERVACIONES', MX, y + 1, 8);
    doc.font('Helvetica').fontSize(8).fillColor(NEGRO)
       .text(datos.notas ?? '', MX + 82, y + 1, { width: IZQ_W - 90, height: 24, ellipsis: true });
    doc.moveTo(MX + 80, y + 12).lineTo(MX + IZQ_W, y + 12).lineWidth(0.5).stroke(AZUL);
    doc.moveTo(MX + 80, y + 25).lineTo(MX + IZQ_W, y + 25).lineWidth(0.5).stroke(AZUL);
    y += 32;

    // Transferencias No. ______  FECHA ______
    const transf = datos.abonos.find(a => a.id_forma_pago === '03');
    etiqueta('TRANSFERENCIAS No.', MX, y + 2, 8);
    valor(transf?.referencia_pago ?? '', MX + 100, y + 1, 140, 8.5);
    doc.moveTo(MX + 98, y + 12).lineTo(MX + 250, y + 12).lineWidth(0.5).stroke(AZUL);
    etiqueta('FECHA', MX + 270, y + 2, 8);
    valor(transf ? formatDate(transf.fecha_deposito) : '', MX + 305, y + 1, 110, 8.5);
    doc.moveTo(MX + 302, y + 12).lineTo(MX + 420, y + 12).lineWidth(0.5).stroke(AZUL);
    y += 20;

    // DEVOLUCIÓN ○   PRONTO PAGO ○   OTROS ○
    let ox = MX;
    ['DEVOLUCIÓN', 'PRONTO PAGO', 'OTROS'].forEach(lbl => {
        etiqueta(lbl, ox, y + 2, 8);
        const lw = doc.widthOfString(lbl) + 6;
        doc.circle(ox + lw + 6, y + 6, 5).lineWidth(0.8).stroke(AZUL);
        ox += lw + 50;
    });
    y += 20;

    // CANTIDAD CON LETRA ( ... )
    etiqueta('CANTIDAD CON LETRA', MX, y + 1, 8);
    doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO)
       .text(numeroALetras(totalMonto), MX + 112, y, { width: IZQ_W - 120, lineBreak: false, ellipsis: true });
    doc.moveTo(MX + 110, y + 12).lineTo(MX + IZQ_W, y + 12).lineWidth(0.5).stroke(AZUL);

    // Totales (a la derecha): SUB. TOTAL / DESC. / TOTAL
    const TX = MX + CW - TOT_W;
    const filasTot: [string, string][] = [
        ['SUB. TOTAL', formatMXN(totalMonto)],
        ['DESC.',      ''],
        ['TOTAL',      formatMXN(totalMonto)],
    ];
    const TOT_H = 19;
    filasTot.forEach(([lbl, val], i) => {
        const ty = BAJO_Y + i * TOT_H;
        doc.rect(TX, ty, 70, TOT_H).lineWidth(0.8).stroke(AZUL);
        doc.rect(TX + 70, ty, TOT_W - 70, TOT_H).lineWidth(0.8).stroke(AZUL);
        etiqueta(lbl, TX, ty + 6, 7.5, { width: 66, align: 'right' });
        doc.font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(NEGRO)
           .text(val, TX + 74, ty + 5, { width: TOT_W - 82, align: 'right', lineBreak: false });
    });

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    y = Math.max(y + 22, BAJO_Y + TOT_H * 3 + 12);
    const FIRMA_Y = Math.min(y + 34, PH - FM - 58);
    const FIRMA_W = 230;
    // Vendedor
    if (datos.nombre_vendedor) {
        doc.font('Helvetica').fontSize(8.5).fillColor(NEGRO)
           .text(datos.nombre_vendedor, MX, FIRMA_Y - 12, { width: FIRMA_W, align: 'center', lineBreak: false });
    }
    doc.moveTo(MX, FIRMA_Y).lineTo(MX + FIRMA_W, FIRMA_Y).lineWidth(0.8).stroke(AZUL);
    etiqueta('NOMBRE Y FIRMA VENDEDOR', MX, FIRMA_Y + 4, 7.5, { width: FIRMA_W, align: 'center' });
    // Cliente (con la firma capturada, si la hay)
    const CX_ = MX + CW - FIRMA_W;
    if (datos.firma_cliente) {
        try {
            const b64 = String(datos.firma_cliente).replace(/^data:image\/\w+;base64,/, '');
            doc.image(Buffer.from(b64, 'base64'), CX_ + 30, FIRMA_Y - 34, { fit: [FIRMA_W - 60, 32] });
        } catch { /* firma inválida: se deja el renglón en blanco */ }
    }
    doc.moveTo(CX_, FIRMA_Y).lineTo(CX_ + FIRMA_W, FIRMA_Y).lineWidth(0.8).stroke(AZUL);
    etiqueta('NOMBRE Y FIRMA CLIENTE', CX_, FIRMA_Y + 4, 7.5, { width: FIRMA_W, align: 'center' });

    // ── NOTA LEGAL ────────────────────────────────────────────────────────────
    const NOTA_Y = PH - FM - 40;
    doc.font('Helvetica-Bold').fontSize(5.6).fillColor(AZUL)
       .text(
           'NOTA: NO RECONOCEMOS NINGÚN PAGO REALIZADO A NUESTROS REPRESENTANTES SI NO CONSTA CON ESTE RECIBO DE COBRO FIRMADO POR NUESTRO REPRESENTANTE. ' +
           'LOS PAGOS CON CHEQUE SON SALVO BUEN COBRO. EN CHEQUES DEVUELTOS POR FALTA DE FONDOS SE COBRARÁ EL 20% ' +
           '(ARTÍCULO 193 DE LA LEY DE TÍTULOS Y OPERACIONES DE CRÉDITO).',
           MX, NOTA_Y, { width: CW, align: 'center' }
       );
    doc.font('Helvetica-Bold').fontSize(5.6).fillColor(AZUL)
       .text('FARMACIAS SYG S.A. DE C.V.', MX, NOTA_Y + 22, { width: CW, align: 'center', lineBreak: false });

    doc.end();
    }); // Promise
}
