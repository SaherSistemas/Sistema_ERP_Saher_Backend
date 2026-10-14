// Lectura de lotes y caducidades del PDF de una factura de proveedor, SIN inteligencia artificial.
//
// La idea: el XML ya dice qué artículos vienen (código, descripción, cantidad). Con eso el PDF no se "entiende":
// se ubica cada artículo en el texto del PDF y, en las líneas que le siguen, se buscan formas de lote y de fecha.
// Lo que no se identifica con seguridad se reporta como "no encontrado en el PDF" para que compras lo capture.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (data: Buffer, opts?: any) => Promise<{ text: string; numpages: number }> =
    require('pdf-parse/lib/pdf-parse.js');

export interface EntradaConcepto {
    indice: number;
    codigos: string[];       // código del proveedor, código de barras, etc. (para ubicarlo en el PDF)
    descripcion: string;
    cantidad: number;        // cantidad que dice el XML
    ignorar?: string[];      // valores que no son lote (clave del SAT, clave de unidad…) y pueden salir cerca de él
}

export interface LoteLeido {
    numero_lote: string;
    fecha_caducidad: string;     // YYYY-MM-DD
    cantidad: number;
    cantidad_inferida: boolean;  // true = se asumió (viene de la cantidad total del XML), no se leyó del PDF
}

export interface ResultadoLotes {
    encontradoEnPdf: boolean;    // se ubicó el artículo en el PDF
    indiceLinea: number | null;  // renglón del PDF donde se ubicó
    lineaPdf: string | null;
    lotes: LoteLeido[];
    sumaLotes: number;
    cuadra: boolean | null;      // suma de lotes == cantidad del XML (null si no hay lotes)
}

// ── Texto del PDF por renglones ─────────────────────────────────────────────

const renderPagina = async (pageData: any): Promise<string> => {
    const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    type It = { x: number; y: number; w: number; s: string };
    const items: It[] = (tc.items as any[])
        .filter(i => String(i.str ?? '').trim() !== '')
        .map(i => ({ x: i.transform[4], y: i.transform[5], w: i.width ?? 0, s: String(i.str) }));

    // Se agrupan por altura (renglón) y dentro de cada renglón de izquierda a derecha
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const filas: It[][] = [];
    for (const it of items) {
        const f = filas[filas.length - 1];
        if (f && Math.abs(f[0].y - it.y) <= 3) f.push(it);
        else filas.push([it]);
    }
    return filas
        .map(f => {
            f.sort((a, b) => a.x - b.x);
            let out = '';
            let finPrev = -Infinity;
            for (const it of f) {
                const hueco = it.x - finPrev;
                out += (out === '' ? '' : hueco > 4 ? '  ' : hueco > 0.8 ? ' ' : '') + it.s;
                finPrev = it.x + it.w;
            }
            return out;
        })
        .join('\n');
};

export async function leerLineasPdf(buffer: Buffer): Promise<string[]> {
    const r = await pdfParse(buffer, { pagerender: renderPagina });
    return r.text
        .split(/\r?\n/)
        .map(l => l.replace(/\s+$/g, ''))
        .filter(l => l.trim() !== '');
}

// ── Utilerías ───────────────────────────────────────────────────────────────

const norm = (s: string) =>
    String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PALABRAS_SUELTAS = new Set([
    'CON', 'SIN', 'PARA', 'DEL', 'LAS', 'LOS', 'UNA', 'POR', 'CAJA', 'TABS', 'TAB', 'CAPS', 'CAP', 'SOL', 'INY', 'AMP',
]);

const tokensDescripcion = (s: string): string[] =>
    Array.from(new Set(
        norm(s).replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(t => t.length >= 3 && !PALABRAS_SUELTAS.has(t)),
    ));

// ── Fechas ──────────────────────────────────────────────────────────────────

interface FechaEnLinea { iso: string; ini: number; fin: number }

const MESES: Record<string, number> = {
    ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DIC: 12,
};

function isoFecha(y: number, m: number, d?: number): string | null {
    const hoy = new Date().getFullYear();
    if (m < 1 || m > 12 || y < hoy - 1 || y > hoy + 15) return null;
    const ult = new Date(y, m, 0).getDate();           // último día del mes
    const dia = d === undefined ? ult : d;             // mm/aaaa → último día del mes
    if (dia < 1 || dia > ult) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const anio = (s: string) => (s.length === 2 ? 2000 + Number(s) : Number(s));

export function buscarFechas(lineaNorm: string): FechaEnLinea[] {
    const res: FechaEnLinea[] = [];
    const usado = (ini: number, fin: number) => res.some(r => ini < r.fin && fin > r.ini);
    const agrega = (m: RegExpExecArray, iso: string | null) => {
        if (!iso) return;
        const ini = m.index, fin = m.index + m[0].length;
        if (!usado(ini, fin)) res.push({ iso, ini, fin });
    };

    let m: RegExpExecArray | null;
    // 2028-04-30
    const reIso = /(?<!\d)(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?!\d)/g;
    while ((m = reIso.exec(lineaNorm))) agrega(m, isoFecha(Number(m[1]), Number(m[2]), Number(m[3])));
    // 30/04/2028 · 30-04-28
    const reDmy = /(?<![\d\/])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})(?![\d\/])/g;
    while ((m = reDmy.exec(lineaNorm))) agrega(m, isoFecha(anio(m[3]), Number(m[2]), Number(m[1])));
    // 30ABR2028 · 30-ABR-28
    const reDMesY = /(?<!\d)(\d{1,2})[\/\- .]*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT|SEP|OCT|NOV|DIC)[A-Z]*[\/\-. ]*(\d{4}|\d{2})(?!\d)/g;
    while ((m = reDMesY.exec(lineaNorm))) agrega(m, isoFecha(anio(m[3]), MESES[m[2]], Number(m[1])));
    // ABR/2028 · ABR-28
    const reMesY = /(?<![A-Z])(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT|SEP|OCT|NOV|DIC)[A-Z]*[\/\-. ]+(\d{4}|\d{2})(?!\d)/g;
    while ((m = reMesY.exec(lineaNorm))) agrega(m, isoFecha(anio(m[2]), MESES[m[1]]));
    // 04/2028
    const reMy = /(?<![\d\/\-.])(\d{1,2})[\/\-.](\d{4})(?![\d\/])/g;
    while ((m = reMy.exec(lineaNorm))) agrega(m, isoFecha(Number(m[2]), Number(m[1])));
    // 04/28
    const reMyy = /(?<![\d\/\-.])(\d{1,2})[\/\-](\d{2})(?![\d\/\-.])/g;
    while ((m = reMyy.exec(lineaNorm))) agrega(m, isoFecha(2000 + Number(m[2]), Number(m[1])));

    return res.sort((a, b) => a.ini - b.ini);
}

// ── Lotes ───────────────────────────────────────────────────────────────────

const RE_ETIQUETA_LOTE = /\b(?:LOTE|LOT|LT|LTE)\b\.?\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,19})/;

function tokenLoteValido(t: string, excluir: Set<string>, cantidad: number, tokensDesc: Set<string>): boolean {
    if (t.length < 3 || t.length > 20) return false;
    if (!/^[A-Z0-9][A-Z0-9\-]*$/.test(t)) return false;        // sin "/" (presentaciones tipo C/10)
    if (!/\d/.test(t)) return false;                            // un lote siempre trae algún número
    if (/^[A-Z]\d{2}$/.test(t)) return false;                  // clave de unidad del SAT (H87, E48…)
    if (/^\d+$/.test(t) && (t.length < 4 || t.length >= 12)) return false;   // muy corto o código de barras
    if (/^\d+(MG|ML|G|MCG|UI|KG|L|PZ|PZA|TAB|TABS|CAP|CAPS|AMP|GR)$/.test(t)) return false;  // 500MG, 5ML…
    if (excluir.has(t) || tokensDesc.has(t)) return false;
    if (/^\d+$/.test(t) && Number(t) === cantidad) return false;
    return true;
}

interface LoteCandidato { lote: string; fecha: string; cantidad: number | null }

function lotesDeLinea(
    lineaOriginal: string, siguienteOriginal: string | null,
    excluir: Set<string>, cantidadXml: number, tokensDesc: Set<string>,
): LoteCandidato[] {
    const linea = norm(lineaOriginal);
    const fechas = buscarFechas(linea);
    if (fechas.length === 0) return [];

    // Quitar las fechas del texto (se dejan espacios para conservar posiciones)
    let sinFechas = linea;
    for (const f of fechas) sinFechas = sinFechas.slice(0, f.ini) + ' '.repeat(f.fin - f.ini) + sinFechas.slice(f.fin);

    // 1) Lote con etiqueta ("LOTE: ABC123")
    const etiquetado = RE_ETIQUETA_LOTE.exec(sinFechas);
    let lote: string | null = etiquetado ? etiquetado[1].replace(/[-\/]+$/, '') : null;
    let posLote = etiquetado ? etiquetado.index : -1;

    // 2) Si no, el token con forma de lote más cercano a la primera fecha
    if (!lote) {
        const posFecha = fechas[0].ini;
        let mejor: { t: string; d: number; p: number } | null = null;
        const re = /[A-Z0-9][A-Z0-9\-\/]*/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(sinFechas))) {
            const t = m[0].replace(/[-\/]+$/, '');
            if (!tokenLoteValido(t, excluir, cantidadXml, tokensDesc)) continue;
            const d = Math.abs(m.index - posFecha);
            if (!mejor || d < mejor.d) mejor = { t, d, p: m.index };
        }
        // Si el "lote" es lo primero del renglón y el renglón trae la descripción del producto, lo más probable es que
        // sea el código interno del artículo y no el lote (el lote va en el renglón de abajo): se descarta.
        if (mejor && mejor.p === sinFechas.search(/[A-Z0-9]/)) {
            const palabras = (sinFechas.match(/[A-Z]{4,}/g) ?? []).length;
            if (palabras >= 2) mejor = null;
        }
        if (mejor) { lote = mejor.t; posLote = mejor.p; }
    }
    // 3) Facturas que ponen la fecha en un renglón y el lote en el de abajo (el lote es el primer dato de ese renglón)
    let textoBase = sinFechas;
    if (!lote && siguienteOriginal) {
        const sig = norm(siguienteOriginal);
        if (buscarFechas(sig).length === 0) {
            const re = /[A-Z0-9][A-Z0-9\-\/]*/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(sig))) {
                const t = m[0].replace(/[-\/]+$/, '');
                if (tokenLoteValido(t, excluir, cantidadXml, tokensDesc)) { lote = t; posLote = m.index; textoBase = sig; break; }
            }
        }
    }
    if (!lote) return [];
    if (excluir.has(lote)) return [];

    // Cantidad del renglón: entero chico que no sea el lote (sirve cuando el artículo trae varios lotes)
    let cantidad: number | null = null;
    const resto = (posLote >= 0 ? textoBase.slice(0, posLote) + ' '.repeat(lote.length) + textoBase.slice(posLote + lote.length) : textoBase);
    const enteros = (resto.match(/(?<![A-Z0-9.,\-\/])\d{1,6}(?![A-Z0-9.,\-\/])/g) ?? [])
        .map(Number).filter(n => n >= 1 && n <= cantidadXml);
    if (enteros.length > 0) cantidad = enteros[0];

    // Una sola fecha por lote: se toma la primera (la caducidad suele ser la única fecha del renglón)
    return [{ lote, fecha: fechas[0].iso, cantidad }];
}

// ── Búsqueda por artículo ───────────────────────────────────────────────────

const RE_FIN_TABLA = /\b(SUBTOTAL|SUB-TOTAL|IMPORTE CON LETRA|CANTIDAD CON LETRA|TOTAL A PAGAR|OBSERVACIONES|SELLO DIGITAL|CADENA ORIGINAL)\b/;

export function extraerLotes(lineas: string[], conceptos: EntradaConcepto[]): Map<number, ResultadoLotes> {
    const lineasNorm = lineas.map(norm);
    const salida = new Map<number, ResultadoLotes>();

    // 1) Ubicar la línea donde aparece cada artículo
    const anclas = new Map<number, number>();
    let cursor = -1;
    for (const c of conceptos) {
        const codigos = Array.from(new Set(c.codigos.map(norm).map(x => x.trim()).filter(x => x.length >= 3)));
        const tokens = tokensDescripcion(c.descripcion);

        let mejorIdx = -1, mejorScore = 0, mejorDespues = -1, mejorScoreDespues = 0;
        for (let i = 0; i < lineasNorm.length; i++) {
            const l = lineasNorm[i];
            let score = 0;
            for (const cod of codigos) {
                if (new RegExp(`(^|[^A-Z0-9])${esc(cod)}([^A-Z0-9]|$)`).test(l)) { score = 100; break; }
            }
            if (score === 0 && tokens.length >= 2) {
                // la descripción puede partirse en dos renglones
                const ventana = `${l} ${lineasNorm[i + 1] ?? ''}`;
                const presentes = tokens.filter(t => ventana.includes(t)).length;
                const frac = presentes / tokens.length;
                const enEstaLinea = tokens.filter(t => l.includes(t)).length;
                // Debe haber al menos una palabra de la descripción en ESTE renglón; gana el que más trae
                if (presentes >= 2 && frac >= 0.7 && enEstaLinea >= 1) score = 50 * frac + 10 * (enEstaLinea / tokens.length);
            }
            if (score > mejorScore) { mejorScore = score; mejorIdx = i; }
            if (score > mejorScoreDespues && i > cursor) { mejorScoreDespues = score; mejorDespues = i; }
        }
        // Se prefiere la que sigue a la anterior (misma secuencia que el XML); si no hay, la mejor de todo el PDF
        const idx = mejorDespues >= 0 && mejorScoreDespues >= mejorScore * 0.6 ? mejorDespues : mejorIdx;
        if (idx >= 0) { anclas.set(c.indice, idx); cursor = idx; }
    }

    const todasAnclas = Array.from(anclas.values()).sort((a, b) => a - b);
    const lineasConLote = new Set<number>();   // renglones que ya dieron un lote (evita repetirlos entre artículos)

    // 2) En el bloque de cada artículo (hasta el siguiente artículo) buscar lote + fecha
    for (const c of conceptos) {
        const idx = anclas.get(c.indice);
        if (idx === undefined) {
            salida.set(c.indice, { encontradoEnPdf: false, indiceLinea: null, lineaPdf: null, lotes: [], sumaLotes: 0, cuadra: null });
            continue;
        }
        const siguiente = todasAnclas.find(a => a > idx);
        let fin = Math.min(siguiente ?? lineas.length, idx + 10, lineas.length);
        for (let i = idx + 1; i < fin; i++) {
            if (RE_FIN_TABLA.test(lineasNorm[i])) { fin = i; break; }
        }

        const excluir = new Set<string>(
            [...c.codigos, ...(c.ignorar ?? [])].map(norm).map(x => x.trim()).filter(Boolean),
        );
        const tokensDesc = new Set<string>(tokensDescripcion(c.descripcion));

        const vistos = new Set<string>();
        const candidatos: LoteCandidato[] = [];
        for (let i = idx; i < fin; i++) {
            for (const cand of lotesDeLinea(lineas[i], i + 1 < fin ? lineas[i + 1] : null, excluir, c.cantidad, tokensDesc)) {
                const k = `${cand.lote}|${cand.fecha}`;
                if (vistos.has(k)) continue;
                vistos.add(k);
                candidatos.push(cand);
                lineasConLote.add(i);
            }
        }

        if (candidatos.length === 0) {
            const desde = Math.max(idx - 3, 0);
            for (let i = idx - 1; i >= desde; i--) {
                if (anclas.size && Array.from(anclas.values()).includes(i)) break;   // ahí empieza otro artículo
                if (lineasConLote.has(i)) break;                                     // ya es de otro artículo
                for (const cand of lotesDeLinea(lineas[i], lineas[i + 1] ?? null, excluir, c.cantidad, tokensDesc)) {
                    const k = `${cand.lote}|${cand.fecha}`;
                    if (vistos.has(k)) continue;
                    vistos.add(k);
                    candidatos.push(cand);
                    lineasConLote.add(i);
                }
            }
        }

        let lotes: LoteLeido[] = [];
        if (candidatos.length === 1) {
            // Un solo lote: toda la cantidad del XML es de ese lote
            lotes = [{ numero_lote: candidatos[0].lote, fecha_caducidad: candidatos[0].fecha, cantidad: c.cantidad, cantidad_inferida: true }];
        } else if (candidatos.length > 1) {
            lotes = candidatos.map(k => ({
                numero_lote: k.lote,
                fecha_caducidad: k.fecha,
                cantidad: k.cantidad ?? 0,
                cantidad_inferida: false,
            }));
        }

        const suma = lotes.reduce((s, l) => s + l.cantidad, 0);
        salida.set(c.indice, {
            encontradoEnPdf: true,
            indiceLinea: idx,
            lineaPdf: lineas[idx].trim(),
            lotes,
            sumaLotes: suma,
            cuadra: lotes.length === 0 ? null : suma === c.cantidad,
        });
    }

    return salida;
}
