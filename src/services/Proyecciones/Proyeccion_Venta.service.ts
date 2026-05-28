// src/services/Proyeccion_VentaService.ts
import { Kardex_Movimiento_ArticuloRepository } from "../../modules/Almacen/Kardex/repositories/Kardex_Movimiento_Articulo.repository";
import { polyfit, polyval } from "../../utils/polyfit";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Componentes = {
    tendencia: number;
    estacional: number | null;
    factor_yoy: number | null;
    peso_tendencia: number | null;
    peso_estacional: number | null;
    alpha_opt: number;          // parámetro Holt nivel (auto-tuneado)
    beta_opt: number;           // parámetro Holt tendencia (auto-tuneado)
    mae_holdout: number | null; // error medio absoluto en el holdout
    ultimo_real: number;
    anio_pasado_periodo: { quincena: string; total: number; svm: number } | null;
    periodos_por_anio: number;
};

// ─── Holt Double Exponential Smoothing ───────────────────────────────────────
function holtSmooth(
    y: number[],
    alpha: number,
    beta: number,
): { level: number; slope: number } {
    if (!y.length) return { level: 0, slope: 0 };
    if (y.length === 1) return { level: Math.max(0, y[0]), slope: 0 };
    let L = Math.max(0, y[0]);
    let S = y[1] - y[0];
    for (let i = 1; i < y.length; i++) {
        const Lp = L;
        L = alpha * Math.max(0, y[i]) + (1 - alpha) * (L + S);
        S = beta * (L - Lp) + (1 - beta) * S;
    }
    return { level: L, slope: S };
}

function holtProject(y: number[], h: number, alpha: number, beta: number): number {
    if (!y.length) return 0;
    if (y.length === 1) return Math.round(Math.max(0, y[0]));
    const { level, slope } = holtSmooth(y, alpha, beta);
    const maxHist = Math.max(...y.map(v => Math.max(0, v)));
    const minHist = Math.max(0, Math.min(...y.map(v => Math.max(0, v))));
    const pred    = level + h * slope;
    return Math.round(Math.max(minHist * 0.10, Math.min(pred, maxHist * 2.5)));
}

// ─── Auto-tuning de Holt por producto ────────────────────────────────────────
// Busca los parámetros (alpha, beta) que minimizan el MAE en los últimos
// `holdout` periodos usando validación "walk-forward" (rolling 1-step-ahead).
// Grilla: 9 × 7 = 63 combinaciones → rápido (<1 ms con arrays de ≤20 puntos).
const ALPHAS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const BETAS  = [0.0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4];

function optimizeHolt(
    y: number[],
    holdout: number,
): { alpha: number; beta: number; mae: number } {
    if (y.length < holdout + 2) return { alpha: 0.45, beta: 0.15, mae: NaN };

    let bestAlpha = 0.45, bestBeta = 0.15, bestMAE = Infinity;

    for (const a of ALPHAS) {
        for (const b of BETAS) {
            let errSum = 0;
            for (let h = 0; h < holdout; h++) {
                const trainSlice = y.slice(0, y.length - holdout + h);
                const { level, slope } = holtSmooth(trainSlice, a, b);
                const pred = Math.max(0, level + slope);
                errSum += Math.abs(pred - y[y.length - holdout + h]);
            }
            const mae = errSum / holdout;
            if (mae < bestMAE) { bestMAE = mae; bestAlpha = a; bestBeta = b; }
        }
    }
    return { alpha: bestAlpha, beta: bestBeta, mae: bestMAE };
}

// ─── Filtro de outliers IQR ───────────────────────────────────────────────────
function filterOutliersIQR(y: number[]): number[] {
    if (y.length < 4) return y;
    const s   = [...y].sort((a, b) => a - b);
    const q1  = s[Math.floor(y.length * 0.25)];
    const q3  = s[Math.floor(y.length * 0.75)];
    const iqr = q3 - q1;
    const lo  = Math.max(0, q1 - 1.5 * iqr);
    const hi  = q3 + 1.5 * iqr;
    const clean = y.filter(v => v >= lo && v <= hi);
    return clean.length >= 2 ? clean : y;
}

// ─────────────────────────────────────────────────────────────────────────────
export const Proyeccion_VentaService = {

    getProyeccionVenta: async (ids_empresas: string[], id_artic: string, ventana_dias: number) => {
        const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodos({
            empresas: ids_empresas, articulo: id_artic, dias: ventana_dias,
        });
        const X      = rangoTiempo.map(q => Number(q.numero));
        const yTotal = rangoTiempo.map(q => Number(q.total));
        const ySVM   = rangoTiempo.map(q => Number(q.svm_total));
        const ySVT   = rangoTiempo.map(q => Number(q.svt_total));

        const nextPeriodo = Math.max(...X) + 1;
        const grado       = Math.min(3, Math.max(1, X.length - 1));

        const mT = polyfit(X, yTotal, grado);
        const mS = polyfit(X, ySVM,   grado);
        const mV = polyfit(X, ySVT,   grado);

        return {
            rangoTiempo,
            proyeccion: {
                periodo: nextPeriodo,
                total: Math.round(polyval(mT.coeffs, nextPeriodo)),
                svm:   Math.round(polyval(mS.coeffs, nextPeriodo)),
                svt:   Math.round(polyval(mV.coeffs, nextPeriodo)),
            },
        };
    },

    getProyeccionVentaPrueba: async (
        ids_empresas: string[],
        cod_int_artic: string,
        ventana_dias: number,
        K_TOP = 10,
    ) => {
        // ── 1. Fetch ─────────────────────────────────────────────────────────
        const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosPrueba({
            articulo: cod_int_artic, dias: ventana_dias,
        });
        const trasladosK = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosSTR({
            articulo: cod_int_artic, dias: ventana_dias,
        });

        // ── 2. Helpers ───────────────────────────────────────────────────────
        const getEnd  = (q: string) => { const p = String(q ?? '').split(' a '); return (p[1] ?? p[0] ?? '').trim(); };
        const parseISO = (s: string) => { const t = new Date(s).getTime(); return isNaN(t) ? 0 : t; };
        const tot      = (a: number[]) => a.reduce((acc, v) => acc + (v || 0), 0);
        const safeMean = (a: number[]) => a.length ? tot(a) / a.length : 0;
        const wavg     = (a: number[]) => {
            if (!a.length) return 0;
            let ws = 0, wv = 0;
            a.forEach((v, i) => { const w = i + 1; ws += w; wv += w * (v || 0); });
            return wv / ws;
        };

        // ── 3. Ordenar ASC (más antiguo primero) ─────────────────────────────
        const sorted = [...rangoTiempo].sort(
            (a, b) => parseISO(getEnd(a.quincena)) - parseISO(getEnd(b.quincena)),
        );
        const N = sorted.length;

        // ── 4. Series ────────────────────────────────────────────────────────
        const X    = sorted.map((_, i) => i + 1);
        const ySVM = sorted.map(q => Number(q.svm_total) || 0);
        const nextPeriodo = N + 1;

        // ── 5. STR → 30 % demanda real ───────────────────────────────────────
        const mapSTRporQuin = new Map<string, number>();
        const mapSTRporEnd  = new Map<string, number>();
        for (const t of trasladosK) {
            const quin = String(t.quincena).trim();
            const end  = getEnd(quin);
            const val  = Number(t.str_total ?? 0) || 0;
            if (quin) mapSTRporQuin.set(quin, val);
            if (end)  mapSTRporEnd.set(end, val);
        }
        const ySTR = sorted.map(p => {
            const quin = String(p.quincena).trim();
            const end  = getEnd(quin);
            if (mapSTRporQuin.has(quin)) return mapSTRporQuin.get(quin)!;
            if (end && mapSTRporEnd.has(end)) return mapSTRporEnd.get(end)!;
            return 0;
        });

        const STR_FACTOR = 0.30;
        const ySTR_dem   = ySTR.map(v => Math.round(v * STR_FACTOR));
        const ySalidas   = ySVM.map((v, i) => v + ySTR_dem[i]);
        const yTotal     = sorted.map(q => { const v = Number(q.total); return Number.isFinite(v) ? v : 0; });
        const usaTotalRango = yTotal.some(v => v > 0);
        const yTotalModelo  = usaTotalRango ? yTotal : ySalidas;

        // ── 6. Ventana K_TOP ──────────────────────────────────────────────────
        const kEff       = Math.min(K_TOP, N);
        const kStart     = N - kEff;
        const recentIdxs = Array.from({ length: kEff }, (_, i) => kStart + i);

        const yTotK  = recentIdxs.map(i => yTotalModelo[i]);
        const ySVMk  = recentIdxs.map(i => ySVM[i]);
        const ySTRk  = recentIdxs.map(i => ySTR_dem[i]);
        const ySalK  = recentIdxs.map(i => ySalidas[i]);
        const lastActual = N > 0 ? yTotalModelo[N - 1] : 0;

        // ── 7. Filtro IQR ─────────────────────────────────────────────────────
        const yTotKc = filterOutliersIQR(yTotK);
        const ySVMkc = filterOutliersIQR(ySVMk);
        const ySTRkc = filterOutliersIQR(ySTRk);
        const ySalKc = filterOutliersIQR(ySalK);

        // ── 8. Auto-tuning de Holt ────────────────────────────────────────────
        // El holdout usa los últimos ~25 % de la ventana K_TOP como test.
        // Se busca (alpha, beta) que minimize el MAE walk-forward en ese holdout.
        const HOLDOUT_N = Math.min(3, Math.max(1, Math.floor(yTotKc.length / 4)));
        const { alpha: aOpt, beta: bOpt, mae: maeHolt } = optimizeHolt(yTotKc, HOLDOUT_N);

        // Los mismos parámetros se aplican a SVM/STR/Sal
        // (el comportamiento estacional y de tendencia es estructuralmente similar).
        const trend_total   = holtProject(yTotKc,  1, aOpt, bOpt);
        const trend_svm     = holtProject(ySVMkc,  1, aOpt, bOpt);
        const trend_str     = holtProject(ySTRkc,  1, aOpt, bOpt);
        const trend_salidas = holtProject(ySalKc,  1, aOpt, bOpt);

        // ── 9. Estacional ─────────────────────────────────────────────────────
        const periodosPerAnio = Math.round(365 / ventana_dias);
        const lyIdx           = N - periodosPerAnio;

        let metodo: 'tendencia' | 'seasonal+tendencia' = 'tendencia';
        let proj_total   = trend_total;
        let proj_svm     = trend_svm;
        let proj_str     = trend_str;
        let proj_salidas = trend_salidas;

        // Confianza basada en MAPE del holdout de Holt
        const meanActual  = safeMean(yTotKc);
        const mapeHolt    = (meanActual > 0 && !isNaN(maeHolt)) ? (maeHolt / meanActual) * 100 : null;

        let confianza: number | null = mapeHolt != null ? Math.max(0, Math.round(100 - mapeHolt)) : null;

        let wT = 1.0, wS = 0.0;
        let maeSeasNaive: number = Infinity;

        let componentes: Componentes = {
            tendencia:        trend_total,
            estacional:       null,
            factor_yoy:       null,
            peso_tendencia:   100,
            peso_estacional:  0,
            alpha_opt:        aOpt,
            beta_opt:         bOpt,
            mae_holdout:      isNaN(maeHolt) ? null : Math.round(maeHolt * 10) / 10,
            ultimo_real:      lastActual,
            anio_pasado_periodo: null,
            periodos_por_anio:   periodosPerAnio,
        };

        if (lyIdx >= 0 && lyIdx < N) {
            // 9a. Suavizado estacional: promedio de 3 periodos (reduce ruido)
            const lyWindow  = [-1, 0, 1].map(o => lyIdx + o).filter(i => i >= 0 && i < N);
            const lyTotal   = lyWindow.reduce((s, i) => s + yTotalModelo[i], 0) / lyWindow.length;
            const lySVM     = lyWindow.reduce((s, i) => s + ySVM[i], 0) / lyWindow.length;

            // 9b. Factor YoY ponderado
            const pairs = recentIdxs
                .map(i => { const li = i - periodosPerAnio; return (li >= 0 && li < N) ? { r: yTotalModelo[i], ly: yTotalModelo[li] } : null; })
                .filter((p): p is { r: number; ly: number } => p !== null && Number.isFinite(p.ly));

            let yoyFactor = 1.0;
            if (pairs.length > 0) {
                const rW  = wavg(pairs.map(p => p.r));
                const lyW = wavg(pairs.map(p => p.ly));
                if (lyW > 0) yoyFactor = Math.min(4.0, Math.max(0.25, rW / lyW));
            }

            const seasonal_total = Math.round(lyTotal * yoyFactor);

            // 9c. Backtest del método estacional sobre el mismo holdout ─────────
            //    Compara seasonal naive vs Holt en los últimos HOLDOUT_N periodos
            //    reales para decidir cuánto peso dar a cada uno (inverse-MAE).
            const seasonalErrors: number[] = [];
            for (let h = 0; h < HOLDOUT_N; h++) {
                const testIdx  = N - HOLDOUT_N + h;          // índice en sorted[]
                const lyTestI  = testIdx - periodosPerAnio;  // mismo periodo año pasado
                if (lyTestI < 0 || lyTestI >= N) continue;
                const pred = yTotalModelo[lyTestI] * yoyFactor;
                seasonalErrors.push(Math.abs(pred - yTotalModelo[testIdx]));
            }
            maeSeasNaive = seasonalErrors.length > 0
                ? seasonalErrors.reduce((a, b) => a + b, 0) / seasonalErrors.length
                : Infinity;

            // 9d. Pesos por inverse-MAE ────────────────────────────────────────
            //    El método que tuvo menos error en el holdout recibe más peso.
            //    Bounds [20 %, 80 %] para no ignorar ninguno completamente.
            const maeT = isNaN(maeHolt) ? 1 : Math.max(0.01, maeHolt);
            const maeS = isFinite(maeSeasNaive) ? Math.max(0.01, maeSeasNaive) : maeT * 3;

            const invT   = 1 / maeT;
            const invS   = 1 / maeS;
            const invSum = invT + invS;

            wT = Math.min(0.80, Math.max(0.20, invT / invSum));
            wS = 1 - wT;

            proj_total = Math.round(wT * trend_total + wS * seasonal_total);

            // 9e. Ancla de recencia [×0.30, ×2.0] ────────────────────────────
            if (lastActual > 0) {
                proj_total = Math.min(
                    Math.round(lastActual * 2.0),
                    Math.max(Math.round(lastActual * 0.30), proj_total),
                );
            }

            // 9f. Distribuir SVM / STR por ratio de los últimos 5 periodos ────
            const STR_WINDOW  = 5;
            const ratioWindow = Math.min(STR_WINDOW, kEff);
            const avgSVM = safeMean(ySVMk.slice(-ratioWindow));
            const avgSTR = safeMean(ySTRk.slice(-ratioWindow));
            const avgSal = avgSVM + avgSTR;
            const ratioSVM = avgSal > 0 ? avgSVM / avgSal : 1.0;
            const ratioSTR = avgSal > 0 ? avgSTR / avgSal : 0.0;

            proj_salidas = proj_total;
            proj_svm     = Math.round(proj_total * ratioSVM);
            proj_str     = Math.round(proj_total * ratioSTR);

            // Confianza mejorada: MAPE del ensemble en el holdout
            const maeEns   = wT * maeT + wS * maeS;
            const mapeEns  = meanActual > 0 ? (maeEns / meanActual) * 100 : null;
            confianza      = mapeEns != null ? Math.max(0, Math.round(100 - mapeEns)) : confianza;

            metodo = 'seasonal+tendencia';
            componentes = {
                tendencia:        trend_total,
                estacional:       seasonal_total,
                factor_yoy:       Math.round(yoyFactor * 100) / 100,
                peso_tendencia:   Math.round(wT * 100),
                peso_estacional:  Math.round(wS * 100),
                alpha_opt:        aOpt,
                beta_opt:         bOpt,
                mae_holdout:      isNaN(maeHolt) ? null : Math.round(maeHolt * 10) / 10,
                ultimo_real:      lastActual,
                anio_pasado_periodo: {
                    quincena: sorted[lyIdx].quincena,
                    total:    Math.round(lyTotal),
                    svm:      Math.round(lySVM),
                },
                periodos_por_anio: periodosPerAnio,
            };
        } else {
            // Sin año anterior: ancla de recencia + redistribución
            if (lastActual > 0) {
                proj_total = Math.min(Math.round(lastActual * 2.0),
                    Math.max(Math.round(lastActual * 0.30), proj_total));
            }
            const STR_WINDOW  = 5;
            const ratioWindow = Math.min(STR_WINDOW, kEff);
            const avgSVM = safeMean(ySVMk.slice(-ratioWindow));
            const avgSTR = safeMean(ySTRk.slice(-ratioWindow));
            const avgSal = avgSVM + avgSTR;
            proj_svm     = Math.round(proj_total * (avgSal > 0 ? avgSVM / avgSal : 1.0));
            proj_str     = Math.round(proj_total * (avgSal > 0 ? avgSTR / avgSal : 0.0));
            proj_salidas = proj_total;

            componentes.tendencia   = proj_total;
            componentes.alpha_opt   = aOpt;
            componentes.beta_opt    = bOpt;
            componentes.mae_holdout = isNaN(maeHolt) ? null : Math.round(maeHolt * 10) / 10;
            componentes.ultimo_real = lastActual;
        }

        // ── 10. Detalle por periodo ───────────────────────────────────────────
        const detallePorPeriodo = sorted.map((p, i) => ({
            numero:        i + 1,
            quincena:      String(p.quincena),
            svm:           ySVM[i],
            str:           ySTR[i],
            str_dem:       ySTR_dem[i],
            total_salidas: ySalidas[i],
            total:         usaTotalRango ? yTotal[i] : ySalidas[i],
        }));

        const idxMasActual = N - 1;

        return {
            periodos:   detallePorPeriodo,
            totales: {
                svm:     tot(ySVM),
                str:     tot(ySTR),
                str_dem: tot(ySTR_dem),
                salidas: tot(ySalidas),
                total:   tot(yTotalModelo),
            },
            str_factor: STR_FACTOR,
            proyeccion: {
                periodo:   nextPeriodo,
                total:     proj_total,
                svm:       proj_svm,
                str:       proj_str,
                salidas:   proj_salidas,
                k_usado:   kEff,
                confianza,                    // 0-100: qué tan fiable es la proyección
                metodo,
                componentes,
            },
            ultimo_periodo:     N > 0 ? detallePorPeriodo[idxMasActual] : null,
            salida_real_ultimo: N > 0 ? ySalidas[idxMasActual]          : 0,
        };
    },
};
