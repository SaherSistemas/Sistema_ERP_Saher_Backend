// src/utils/polyfit.ts
/**
 * Ajuste polinómico por mínimos cuadrados usando ecuaciones normales
 * y eliminación Gaussiana (grados 1..5). Incluye variantes:
 *  - polyfit: sobre y (puede dar negativos al extrapolar)
 *  - polyfitLog: sobre log(y) para evitar negativos (recomendado en ventas)
 * Utilidades:
 *  - polyval, polyvalClipped, polyToString
 *  - sumProjection(xs, coeffs, {clipMin})  -> suma predicciones (clipeadas)
 *  - reconcileTotals(...)                   -> coherencia de TOTAL vs SVM+SVT
 */

export type PolyfitResult = {
    degree: number;
    coeffs: number[]; // [a, b, c, d] para grado 3 => a*x^3 + b*x^2 + c*x + d
};

/** Pequeño epsilon para evitar log(0) */
const EPS = 1e-6;

/** Ajusta el grado al máximo posible dado el # de x únicos (evita caídas a 0) */
function saneDegree(requested: number, uniqueX: number): number {
    const hard = Math.max(1, Math.min(5, requested));
    // Para identificar un polinomio de grado d se necesitan al menos d+1 puntos únicos
    // => d <= uniqueX - 1
    return Math.max(1, Math.min(hard, Math.max(1, uniqueX - 1)));
}

/** Ajuste polinómico estándar (puede dar negativos). */
export function polyfit(
    x: number[],
    y: number[],
    degree = 3,
    lambda = 1e-6 // un poco más alto que 1e-8 para estabilidad
): PolyfitResult {
    if (x.length !== y.length || x.length === 0) {
        return { degree, coeffs: Array(degree + 1).fill(0) };
    }
    const uniqueX = new Set(x).size;
    const mWanted = degree + 1;

    // Limita el grado por disponibilidad real de puntos únicos
    const deg = saneDegree(degree, uniqueX);
    const m = deg + 1;

    if (x.length < m || uniqueX < m) {
        return { degree: deg, coeffs: Array(m).fill(0) };
    }

    // Matriz de Vandermonde en orden [x^deg ... x^0]
    const n = x.length;
    const X: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
    for (let i = 0; i < n; i++) {
        let val = 1;
        const powers: number[] = new Array(m);
        for (let p = 0; p < m; p++) {
            powers[p] = val;
            val *= x[i];
        }
        for (let j = 0; j < m; j++) {
            X[i][j] = powers[deg - j];
        }
    }

    const XT = transpose(X);
    const XTX = matMul(XT, X);
    const XTy = matVecMul(XT, y);

    // Ridge
    for (let i = 0; i < m; i++) XTX[i][i] += lambda;

    try {
        const coeffs = solveGaussian(XTX, XTy);
        for (let i = 0; i < coeffs.length; i++) {
            if (!Number.isFinite(coeffs[i])) coeffs[i] = 0;
        }
        return { degree: deg, coeffs };
    } catch {
        return { degree: deg, coeffs: Array(m).fill(0) };
    }
}

/**
 * Ajuste polinómico sobre log(y). Evita negativos al predecir
 * (al re-exponenciar), muy útil para ventas.
 */
export function polyfitLog(
    x: number[],
    y: number[],
    degree = 2,  // por defecto más conservador
    lambda = 1e-6
): PolyfitResult {
    // Sanitiza y -> log(y)
    const ylog = y.map(v => Math.log(Math.max(v, EPS)));
    return polyfit(x, ylog, degree, lambda);
}

/** Evalúa un polinomio (Horner) */
export function polyval(coeffs: number[], x: number): number {
    let acc = 0;
    for (let i = 0; i < coeffs.length; i++) acc = acc * x + coeffs[i];
    return acc;
}

/**
 * Evalúa y recorta por debajo (default 0).
 * Útil para polinomios en espacio original.
 */
export function polyvalClipped(
    coeffs: number[],
    x: number,
    clipMin = 0
): number {
    return Math.max(clipMin, polyval(coeffs, x));
}

/**
 * Evalúa un modelo entrenado con polyfitLog: exp(polyval(...)).
 * Siempre devuelve valores >= EPS (≈0).
 */
export function polyvalFromLog(coeffs: number[], x: number): number {
    return Math.exp(polyval(coeffs, x));
}

export function polyToString(coeffs: number[], fractionDigits = 4): string {
    const d = coeffs.length - 1;
    const parts: string[] = [];
    coeffs.forEach((c, i) => {
        const pow = d - i;
        const num = Number(c.toFixed(fractionDigits));
        const sign = num >= 0 ? (i === 0 ? "" : " + ") : " - ";
        const absVal = Math.abs(num);
        let term = "";
        if (pow > 1) term = `${absVal}x^${pow}`;
        else if (pow === 1) term = `${absVal}x`;
        else term = `${absVal}`;
        parts.push(`${sign}${term}`);
    });
    return parts.join("");
}

/** Suma predicciones sobre xs. Útil para tus periodos/días futuros. */
export function sumProjection(
    xs: number[],
    coeffs: number[],
    opts?: { clipMin?: number; fromLog?: boolean; round?: boolean }
): number {
    const clipMin = opts?.clipMin ?? 0;
    const fromLog = !!opts?.fromLog;
    const preds = xs.map(t =>
        fromLog ? Math.max(clipMin, Math.exp(polyval(coeffs, t)))
            : Math.max(clipMin, polyval(coeffs, t))
    );
    const s = preds.reduce((a, b) => a + b, 0);
    return opts?.round ? Math.round(s) : s;
}

/**
 * Reconciliación de totales:
 *  - Calcula la suma SVM+SVT (clipeada).
 *  - Calcula el total por modelo independiente (si se pasa).
 *  - Devuelve un objeto con ambos y una sugerencia de cuál mostrar,
 *    basándose en la discrepancia relativa.
 */
export function reconcileTotals(params: {
    xs: number[];
    coeffsSVM: number[];
    coeffsSVT: number[];
    coeffsTotal?: number[]; // opcional
    fromLog?: boolean;      // si los modelos están en log-space
    clipMin?: number;       // 0 por defecto
    discrepancyPct?: number; // % para avisar (default 20%)
}) {
    const {
        xs, coeffsSVM, coeffsSVT, coeffsTotal,
        fromLog = false, clipMin = 0, discrepancyPct = 20
    } = params;

    const sumSVM = sumProjection(xs, coeffsSVM, { clipMin, fromLog });
    const sumSVT = sumProjection(xs, coeffsSVT, { clipMin, fromLog });
    const bySum = Math.round(sumSVM + sumSVT);

    if (!coeffsTotal) {
        return { bySum, byModelTotal: null as number | null, use: 'bySum' as const, warn: false };
    }

    const byModelTotal = Math.round(sumProjection(xs, coeffsTotal, { clipMin, fromLog }));
    const diff = Math.abs(bySum - byModelTotal);
    const base = Math.max(1, Math.max(bySum, byModelTotal));
    const pct = (100 * diff) / base;
    const warn = pct >= discrepancyPct;

    // Política simple: si difieren mucho, reporta ambos; si no, usa la suma.
    const use = warn ? ('both' as const) : ('bySum' as const);
    return { bySum, byModelTotal, use, warn, pctDiff: pct };
}

// -------- utilidades algebra --------
function transpose(A: number[][]): number[][] {
    const r = A.length, c = A[0].length;
    const T: number[][] = Array.from({ length: c }, () => Array(r).fill(0));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
    return T;
}
function matMul(A: number[][], B: number[][]): number[][] {
    const r = A.length, k = A[0].length, c = B[0].length;
    const out: number[][] = Array.from({ length: r }, () => Array(c).fill(0));
    for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
            let s = 0;
            for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
            out[i][j] = s;
        }
    }
    return out;
}
function matVecMul(A: number[][], v: number[]): number[] {
    const r = A.length, c = A[0].length;
    const out = new Array(r).fill(0);
    for (let i = 0; i < r; i++) {
        let s = 0;
        for (let j = 0; j < c; j++) s += A[i][j] * v[j];
        out[i] = s;
    }
    return out;
}
function solveGaussian(Ain: number[][], bin: number[]): number[] {
    // Eliminación Gaussiana con pivoteo parcial
    const n = bin.length;
    const A = Ain.map((row) => row.slice());
    const b = bin.slice();

    for (let i = 0; i < n; i++) {
        // Pivoteo parcial
        let maxRow = i;
        for (let r = i + 1; r < n; r++) {
            if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) maxRow = r;
        }
        if (i !== maxRow) {
            [A[i], A[maxRow]] = [A[maxRow], A[i]];
            [b[i], b[maxRow]] = [b[maxRow], b[i]];
        }
        const piv = A[i][i];
        if (Math.abs(piv) < 1e-12) throw new Error("Sistema singular");

        // Normalizar fila i
        for (let j = i; j < n; j++) A[i][j] /= piv;
        b[i] /= piv;

        // Eliminar debajo
        for (let r = i + 1; r < n; r++) {
            const f = A[r][i];
            if (f === 0) continue;
            for (let j = i; j < n; j++) A[r][j] -= f * A[i][j];
            b[r] -= f * b[i];
        }
    }
    // Sustitución hacia atrás
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let s = b[i];
        for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
        x[i] = s;
    }
    return x;
}
