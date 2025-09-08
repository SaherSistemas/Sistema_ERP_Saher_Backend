// src/utils/polyfit.ts
/**
 * Ajuste polinómico por mínimos cuadrados usando ecuaciones normales
 * y eliminación Gaussiana (grado chico: 1..5). Por defecto grado 3.
 */

export type PolyfitResult = {
    degree: number;
    coeffs: number[]; // [a, b, c, d] para grado 3 => a*x^3 + b*x^2 + c*x + d
};

export function polyfit(x: number[], y: number[], degree = 3): PolyfitResult {
    if (x.length !== y.length || x.length === 0) {
        throw new Error("polyfit: x e y deben tener misma longitud y ser > 0");
    }
    if (degree < 1 || degree > 5) {
        throw new Error("polyfit: degree debe estar entre 1 y 5");
    }

    // Construye matriz de Vandermonde X y vector y
    // X[i, j] = x_i^(degree - j)
    const n = x.length;
    const m = degree + 1;
    const X: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
    for (let i = 0; i < n; i++) {
        let val = 1;
        // Llenamos de menor a mayor potencia para eficiencia, luego invertimos
        const powers: number[] = new Array(m);
        for (let p = 0; p < m; p++) {
            powers[p] = val;
            val *= x[i];
        }
        // Queremos [x^degree, ..., x^1, x^0]
        for (let j = 0; j < m; j++) {
            X[i][j] = powers[degree - j];
        }
    }

    // Computar X^T X y X^T y
    const XT = transpose(X);
    const XTX = matMul(XT, X);
    const XTy = matVecMul(XT, y);

    // Resolver (X^T X) c = (X^T y)
    const coeffs = solveGaussian(XTX, XTy);
    return { degree, coeffs };
}

export function polyval(coeffs: number[], x: number): number {
    // Horner
    let acc = 0;
    for (let i = 0; i < coeffs.length; i++) {
        acc = acc * x + coeffs[i];
    }
    return acc;
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

// -------- utilidades de álgebra pequeñas --------
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
    // Resolución por eliminación Gaussiana con pivoteo parcial.
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
        if (Math.abs(piv) < 1e-12) throw new Error("Sistema singular en gaussian");

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
