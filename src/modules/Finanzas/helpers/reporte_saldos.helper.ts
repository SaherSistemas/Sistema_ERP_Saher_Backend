import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import type { Response } from 'express';

export interface FilaSaldoReporte {
    nombre:       string;
    rfc:          string;
    num_facturas: number;
    total_saldo:  number;
    total_vencido: number;
    total_vigente: number;
}

const fmt = (n: number) =>
    n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── PDF ───────────────────────────────────────────────────────────────────────
export function generarPDFSaldos(
    res: Response,
    titulo: string,
    fecha_corte: string,
    filas: FilaSaldoReporte[]
) {
    const doc = new PDFDocument({ margin: 40, size: 'LETTER', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="saldos_${fecha_corte}.pdf"`);
    doc.pipe(res);

    // ── Encabezado ──
    doc.fontSize(16).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`Fecha de corte: ${fmtFecha(fecha_corte)}`, { align: 'center' });
    doc.moveDown(0.5);

    // ── Totales generales ──
    const totalSaldo   = filas.reduce((s, r) => s + r.total_saldo,   0);
    const totalVencido = filas.reduce((s, r) => s + r.total_vencido, 0);
    const totalVigente = filas.reduce((s, r) => s + r.total_vigente, 0);

    doc.fontSize(10).font('Helvetica')
        .text(`Total saldo: $${fmt(totalSaldo)}   |   Vencido: $${fmt(totalVencido)}   |   Vigente: $${fmt(totalVigente)}   |   Registros: ${filas.length}`,
              { align: 'center' });
    doc.moveDown(0.8);

    // ── Cabecera tabla ──
    const COL = { nombre: 40, rfc: 260, facturas: 370, saldo: 420, vencido: 510, vigente: 600 };
    const ROW_H  = 18;
    const PAGE_W = doc.page.width - 80;

    const drawHeader = () => {
        doc.rect(40, doc.y, PAGE_W, ROW_H).fill('#374151');
        doc.fill('white').fontSize(8).font('Helvetica-Bold');
        const y = doc.y + 5;
        doc.text('Nombre',           COL.nombre,   y, { width: 215, lineBreak: false });
        doc.text('RFC',              COL.rfc,       y, { width: 100, lineBreak: false });
        doc.text('Facturas',         COL.facturas,  y, { width: 45,  lineBreak: false, align: 'right' });
        doc.text('Saldo total',      COL.saldo,     y, { width: 85,  lineBreak: false, align: 'right' });
        doc.text('Vencido',          COL.vencido,   y, { width: 85,  lineBreak: false, align: 'right' });
        doc.text('Vigente',          COL.vigente,   y, { width: 85,  lineBreak: false, align: 'right' });
        doc.fill('black').moveDown(0);
        doc.y += ROW_H + 2;
    };

    drawHeader();

    // ── Filas ──
    filas.forEach((f, i) => {
        if (doc.y > doc.page.height - 80) {
            doc.addPage();
            drawHeader();
        }
        const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(40, doc.y, PAGE_W, ROW_H).fill(bg);
        doc.fill(f.total_vencido > 0 ? '#991b1b' : '#111827').fontSize(8).font('Helvetica');
        const y = doc.y + 5;
        doc.text(f.nombre.slice(0, 35),      COL.nombre,   y, { width: 215, lineBreak: false });
        doc.text(f.rfc,                       COL.rfc,       y, { width: 100, lineBreak: false });
        doc.text(String(f.num_facturas),      COL.facturas,  y, { width: 45,  lineBreak: false, align: 'right' });
        doc.text(`$${fmt(f.total_saldo)}`,    COL.saldo,     y, { width: 85,  lineBreak: false, align: 'right' });
        doc.text(`$${fmt(f.total_vencido)}`,  COL.vencido,   y, { width: 85,  lineBreak: false, align: 'right' });
        doc.text(`$${fmt(f.total_vigente)}`,  COL.vigente,   y, { width: 85,  lineBreak: false, align: 'right' });
        doc.fill('black');
        doc.y += ROW_H;
    });

    // ── Fila de totales ──
    doc.moveDown(0.3);
    doc.rect(40, doc.y, PAGE_W, ROW_H).fill('#e0e7ff');
    doc.fill('#1e1b4b').fontSize(8).font('Helvetica-Bold');
    const y = doc.y + 5;
    doc.text('TOTALES', COL.nombre, y, { width: 215, lineBreak: false });
    doc.text(`$${fmt(totalSaldo)}`,   COL.saldo,   y, { width: 85, lineBreak: false, align: 'right' });
    doc.text(`$${fmt(totalVencido)}`, COL.vencido, y, { width: 85, lineBreak: false, align: 'right' });
    doc.text(`$${fmt(totalVigente)}`, COL.vigente, y, { width: 85, lineBreak: false, align: 'right' });

    doc.end();
}

// ── XLSX ──────────────────────────────────────────────────────────────────────
export function generarXLSXSaldos(
    res: Response,
    titulo: string,
    fecha_corte: string,
    filas: FilaSaldoReporte[]
) {
    const wb = XLSX.utils.book_new();

    const data: any[][] = [
        [titulo],
        [`Fecha de corte: ${fmtFecha(fecha_corte)}`],
        [],
        ['Nombre', 'RFC', 'Facturas', 'Saldo total', 'Vencido', 'Vigente'],
        ...filas.map(f => [f.nombre, f.rfc, f.num_facturas, f.total_saldo, f.total_vencido, f.total_vigente]),
        [],
        ['TOTALES', '',
            filas.reduce((s, r) => s + r.num_facturas, 0),
            filas.reduce((s, r) => s + r.total_saldo,   0),
            filas.reduce((s, r) => s + r.total_vencido, 0),
            filas.reduce((s, r) => s + r.total_vigente, 0),
        ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Anchos de columna
    ws['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

    // Formato numérico para columnas de dinero (D, E, F desde fila 5)
    const moneyFmt = '"$"#,##0.00';
    filas.forEach((_, i) => {
        const row = i + 5; // fila 1-indexed
        ['D', 'E', 'F'].forEach(col => {
            const cell = ws[`${col}${row}`];
            if (cell) cell.z = moneyFmt;
        });
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Saldos');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="saldos_${fecha_corte}.xlsx"`);
    res.send(buf);
}
