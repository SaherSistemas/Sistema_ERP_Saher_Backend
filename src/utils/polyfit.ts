// src/utils/polyfit.ts
/**
 * Ajuste polinómico por mínimos cuadrados usando ecuaciones normales
 * y eliminación Gaussiana (grados 1..5). Incluye variantes:
 *  - polyfit: sobre y (puede dar negativos al extrapolar)
 *  - polyfitLog: sobre log(y) para evitar negativos (recomendado en ventas)
 * Utilidades:
 *  - polyval, polyvalClipped, polyvalFromLog, polyToString
 *  - sumProjection(xs, coeffs, {clipMin})  -> suma predicciones (clipeadas)
 *  - reconcileTotals(...)                   -> coherencia de TOTAL vs SVM+SVT
 *  - proyectaVenta(x, y, nextX)            -> proyección robusta para ventas
 */

export type PolyfitResult = {
    degree: number;
    coeffs: number[]; // [a, b, c, d] para grado 3 => a*x^3 + b*x^2 + c*x + d
};

/** Pequeño epsilon para evitar log(0) */
const EPS = 1e-6;

/** Grado máximo recomendado para ventas (evita sobreajuste) */
const MAX_GRADO_VENTAS = 2;

/** Factor máximo de extrapolación respecto al máximo histórico */
const MAX_EXTRAP_FACTOR = 3;

/** Factor mínimo de extrapolación respecto al mínimo histórico */
const MIN_EXTRAP_FACTOR = 0.1;

// ─────────────────────────────────────────────
// NÚCLEO: ajuste polinómico
// ─────────────────────────────────────────────

/** Ajusta el grado al máximo posible dado el # de x únicos (evita caídas a 0) */
function saneDegree(requested: number, uniqueX: number): number {
    const hard = Math.max(1, Math.min(5, requested));
    return Math.max(1, Math.min(hard, Math.max(1, uniqueX - 1)));
}

/** Ajuste polinómico estándar (puede dar negativos). */
export function polyfit(
    x: number[],
    y: number[],
    degree = 3,
    lambda = 1e-6
): PolyfitResult {
    if (x.length !== y.length || x.length === 0) {
        return { degree, coeffs: Array(degree + 1).fill(0) };
    }
    const uniqueX = new Set(x).size;
    const deg = saneDegree(degree, uniqueX);
    const m = deg + 1;

    if (x.length < m || uniqueX < m) {
        return { degree: deg, coeffs: Array(m).fill(0) };
    }

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
 * Ajuste polinómico sobre log(y).
 * Evita negativos al predecir (re-exponenciando), ideal para ventas.
 */
export function polyfitLog(
    x: number[],
    y: number[],
    degree = 2,
    lambda = 1e-6
): PolyfitResult {
    const ylog = y.map(v => Math.log(Math.max(v, EPS)));
    return polyfit(x, ylog, degree, lambda);
}

// ─────────────────────────────────────────────
// EVALUACIÓN
// ─────────────────────────────────────────────

/** Evalúa un polinomio (método de Horner) */
export function polyval(coeffs: number[], x: number): number {
    let acc = 0;
    for (let i = 0; i < coeffs.length; i++) acc = acc * x + coeffs[i];
    return acc;
}

/** Evalúa y recorta por debajo de clipMin (default 0). */
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

// ─────────────────────────────────────────────
// PROYECCIÓN ROBUSTA PARA VENTAS  ← NUEVA
// ─────────────────────────────────────────────

/**
 * Proyecta un único valor futuro de ventas de forma robusta:
 *  1. Usa polyfitLog (espacio log → siempre positivo)
 *  2. Limita el grado a MAX_GRADO_VENTAS (≤2) para evitar sobreajuste
 *  3. Aplica guardrails: no más de 3× el máximo histórico,
 *     no menos de 10% del mínimo histórico
 *  4. Fallback con tendencia lineal simple si falla el ajuste
 *
 * @param x         Periodos históricos (ej. [1,2,3,4,5])
 * @param y         Ventas históricas correspondientes
 * @param nextX     Periodo a proyectar
 * @param gradoMax  Grado máximo a intentar (default 2)
 * @returns         Proyección entera ≥ 0
 */
export function proyectaVenta(
    x: number[],
    y: number[],
    nextX: number,
    gradoMax = MAX_GRADO_VENTAS
): number {
    if (x.length === 0) return 0;
    if (x.length === 1) return Math.round(Math.max(0, y[0]));

    // Grado efectivo: conservador y acotado por puntos disponibles
    const gradoEfectivo = Math.min(gradoMax, MAX_GRADO_VENTAS, x.length - 1);

    const maxHist = Math.max(...y);
    const minHist = Math.max(0, Math.min(...y));

    try {
        const m = polyfitLog(x, y, gradoEfectivo);
        const pred = polyvalFromLog(m.coeffs, nextX);

        // Guardrails: acotar predicción a rango razonable
        const upper = maxHist * MAX_EXTRAP_FACTOR;
        const lower = minHist * MIN_EXTRAP_FACTOR;
        const clamped = Math.min(upper, Math.max(lower, pred));

        return Math.round(clamped);
    } catch {
        // Fallback: tendencia lineal por los extremos del histórico
        const n = y.length;
        const slope = (y[n - 1] - y[0]) / Math.max(1, x[n - 1] - x[0]);
        const fallback = y[n - 1] + slope * (nextX - x[n - 1]);
        return Math.round(Math.max(0, fallback));
    }
}

/**
 * Versión tipada del resultado de proyectaVentas con coherencia entre partes.
 */
export type ProyeccionVentas = {
    total: number;
    svm: number;
    str: number;
    salidas: number;
    /** true si SVM+STR difiere >discrepancyPct% del total proyectado */
    warnCoherencia: boolean;
    /** diferencia porcentual entre suma de partes y total */
    pctDiff: number;
};

/**
 * Proyecta total, SVM, STR y salidas de forma coherente.
 * Detecta automáticamente si la suma de partes difiere mucho del total.
 *
 * @param Xk              Periodos históricos disponibles
 * @param yTotK           Histórico de ventas totales
 * @param ySVMk           Histórico de ventas SVM
 * @param ySTRk           Histórico de ventas STR
 * @param ySalK           Histórico de salidas
 * @param nextPeriodo     Periodo a proyectar
 * @param discrepancyPct  Umbral % para advertir incoherencia (default 15)
 */
export function proyectaVentas(
    Xk: number[],
    yTotK: number[],
    ySVMk: number[],
    ySTRk: number[],
    ySalK: number[],
    nextPeriodo: number,
    discrepancyPct = 15
): ProyeccionVentas {
    const total = proyectaVenta(Xk, yTotK, nextPeriodo);
    const svm = proyectaVenta(Xk, ySVMk, nextPeriodo);
    const str = proyectaVenta(Xk, ySTRk, nextPeriodo);
    const salidas = proyectaVenta(Xk, ySalK, nextPeriodo);

    const sumaParts = svm + str;
    const diff = Math.abs(sumaParts - total);
    const base = Math.max(1, total);
    const pctDiff = (100 * diff) / base;
    const warnCoherencia = pctDiff >= discrepancyPct;

    return { total, svm, str, salidas, warnCoherencia, pctDiff };
}

// ─────────────────────────────────────────────
// UTILIDADES DE TEXTO Y PROYECCIÓN ACUMULADA
// ─────────────────────────────────────────────

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

/** Suma predicciones sobre xs. Útil para proyectar múltiples periodos futuros. */
export function sumProjection(
    xs: number[],
    coeffs: number[],
    opts?: { clipMin?: number; fromLog?: boolean; round?: boolean }
): number {
    const clipMin = opts?.clipMin ?? 0;
    const fromLog = !!opts?.fromLog;
    const preds = xs.map(t =>
        fromLog
            ? Math.max(clipMin, Math.exp(polyval(coeffs, t)))
            : Math.max(clipMin, polyval(coeffs, t))
    );
    const s = preds.reduce((a, b) => a + b, 0);
    return opts?.round ? Math.round(s) : s;
}

// ─────────────────────────────────────────────
// RECONCILIACIÓN DE TOTALES
// ─────────────────────────────────────────────

/**
 * Reconciliación de totales:
 *  - Calcula la suma SVM+SVT (clipeada).
 *  - Calcula el total por modelo independiente (si se pasa).
 *  - Devuelve ambos y una sugerencia de cuál mostrar
 *    basándose en la discrepancia relativa.
 */
export function reconcileTotals(params: {
    xs: number[];
    coeffsSVM: number[];
    coeffsSVT: number[];
    coeffsTotal?: number[];
    fromLog?: boolean;
    clipMin?: number;
    discrepancyPct?: number;
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

    const use = warn ? ('both' as const) : ('bySum' as const);
    return { bySum, byModelTotal, use, warn, pctDiff: pct };
}

// ─────────────────────────────────────────────
// ÁLGEBRA LINEAL (INTERNO)
// ─────────────────────────────────────────────

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
    const n = bin.length;
    const A = Ain.map((row) => row.slice());
    const b = bin.slice();

    for (let i = 0; i < n; i++) {
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

        for (let j = i; j < n; j++) A[i][j] /= piv;
        b[i] /= piv;

        for (let r = i + 1; r < n; r++) {
            const f = A[r][i];
            if (f === 0) continue;
            for (let j = i; j < n; j++) A[r][j] -= f * A[i][j];
            b[r] -= f * b[i];
        }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let s = b[i];
        for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
        x[i] = s;
    }
    return x;
}