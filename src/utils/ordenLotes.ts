// Orden en que se ofrecen / se surten los lotes de un artículo (el primero de la lista es el que debe salir primero).
//
// Regla (todas las pantallas deben usar esta misma):
//  1. Caducidad más próxima (por DÍA). Sin caducidad, al final.
//  2. Si empatan en caducidad y los dos lotes tienen la MISMA FORMA (solo dígitos, o letras+números en el mismo
//     orden: LB2630 / LB2631, D32K25 / D32K26) → comparación natural del número de lote: los números como
//     números (792 antes que 7892) y las letras alfabéticamente.
//  3. Si tienen formas distintas no hay forma confiable de saber cuál es más viejo: los grupos de la misma forma
//     se ordenan por la fecha de entrada del lote más antiguo de cada grupo.
//  4. Dentro de la misma forma, si el número es igual, la fecha de entrada y por último el texto del lote.
// El orden es estable: filas con el mismo lote conservan el orden en que venían (p. ej. por ubicación).

export interface LoteInfo {
    numero?: string | null;
    caducidad?: Date | string | null;
    entrada?: Date | string | null;   // cuándo se dio de alta el lote (createdAt)
}

const SIN_FECHA = 8.64e15;   // "muy lejos": lo que no tiene fecha de entrada va después

const diaDe = (v: unknown): string | null => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v as any);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const msDe = (v: unknown): number => {
    if (!v) return SIN_FECHA;
    const d = v instanceof Date ? v : new Date(v as any);
    return isNaN(d.getTime()) ? SIN_FECHA : d.getTime();
};

// "LB2630" → "A#", "D32K25" → "A#A#", "26141963" → "#", "6G7892" → "#A#"
const formaDe = (numero: string): string =>
    numero.toUpperCase().replace(/\s+/g, '').replace(/\d+/g, '#').replace(/[^\d#\W_]+/g, 'A');

const trozos = (s: string): string[] => s.match(/\d+|\D+/g) ?? [];

// Comparación natural: pedazos de números como números, pedazos de texto alfabéticamente
export function compararNatural(a: string, b: string): number {
    const ta = trozos(a.toUpperCase());
    const tb = trozos(b.toUpperCase());
    const n = Math.min(ta.length, tb.length);
    for (let i = 0; i < n; i++) {
        const x = ta[i];
        const y = tb[i];
        const nx = /^\d+$/.test(x);
        const ny = /^\d+$/.test(y);
        if (nx && ny) {
            const xa = x.replace(/^0+(?=\d)/, '');
            const ya = y.replace(/^0+(?=\d)/, '');
            if (xa.length !== ya.length) return xa.length - ya.length;
            if (xa !== ya) return xa < ya ? -1 : 1;
        } else if (nx !== ny) {
            return nx ? -1 : 1;           // los números van antes que las letras
        } else if (x !== y) {
            return x.localeCompare(y, 'es');
        }
    }
    return ta.length - tb.length;
}

export function ordenarLotes<T>(items: T[], info: (item: T) => LoteInfo): T[] {
    const datos = items.map((item, idx) => {
        const i = info(item);
        const numero = String(i.numero ?? '').trim();
        return { item, idx, numero, dia: diaDe(i.caducidad), entrada: msDe(i.entrada), forma: formaDe(numero) };
    });

    // Por cada caducidad y forma de número, la entrada del lote más antiguo: ordena los grupos de formas distintas
    const entradaDelGrupo = new Map<string, number>();
    for (const d of datos) {
        const k = `${d.dia}|${d.forma}`;
        entradaDelGrupo.set(k, Math.min(entradaDelGrupo.get(k) ?? SIN_FECHA, d.entrada));
    }

    datos.sort((a, b) => {
        if (a.dia !== b.dia) {
            if (a.dia === null) return 1;
            if (b.dia === null) return -1;
            return a.dia < b.dia ? -1 : 1;
        }
        if (a.forma !== b.forma) {
            const ea = entradaDelGrupo.get(`${a.dia}|${a.forma}`) ?? SIN_FECHA;
            const eb = entradaDelGrupo.get(`${b.dia}|${b.forma}`) ?? SIN_FECHA;
            if (ea !== eb) return ea - eb;
            return a.forma < b.forma ? -1 : 1;
        }
        const nat = compararNatural(a.numero, b.numero);
        if (nat !== 0) return nat;
        if (a.entrada !== b.entrada) return a.entrada - b.entrada;
        return a.idx - b.idx;
    });

    return datos.map(d => d.item);
}
