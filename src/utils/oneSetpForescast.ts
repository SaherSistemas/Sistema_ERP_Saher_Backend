// src/utils/oneStepForecast.ts
// 1-step ahead robusto con ensamble y selección/ponderación por backtest.

export type OneStepOpts = {
    seasonPeriod?: number;   // p.ej. 7 (día de semana) o 24 (quincenas -> 24 al año)
    seasonsBack?: number;    // cuántas temporadas usar en la mediana (default 3)
    winsorPct?: number;      // recorte alto para outliers (0.05 = 95% cap)
    recentWindow?: number;   // ventana reciente para tendencia/polyfitLog (default 24)
    backtestHorizon?: number;// cuántos puntos recientes para backtest 1-step (default 12)
    blend?: 'best' | 'weighted'; // elegir mejor o ponderar por 1/WAPE
    minVal?: number;         // piso para evitar negativos (default 0)
    eps?: number;            // para logs y divisiones (default 1e-6)
};

export type OneStepResult = {
    yhat: number;
    components: {
        snaive: number;
        theilsen: number;
        polylog: number;
    };
    choice: 'snaive' | 'theilsen' | 'polylog' | 'weighted';
    weights?: { snaive: number; theilsen: number; polylog: number };
    metrics: {
        snaive: { MAE: number; WAPE: number };
        theilsen: { MAE: number; WAPE: number };
        polylog: { MAE: number; WAPE: number };
    };
};

export function oneStepForecast(y: number[], opts: OneStepOpts = {}): OneStepResult {
    const n = y.length;
    if (n < 8) throw new Error("Se requieren al menos 8 observaciones.");

    const seasonPeriod = opts.seasonPeriod ?? 7;
    const seasonsBack = opts.seasonsBack ?? 3;
    const winsorPct = opts.winsorPct ?? 0.05;
    const recentWindow = Math.min(opts.recentWindow ?? 24, n);
    const backQ = Math.min(opts.backtestHorizon ?? 12, n - 3);
    const blendMode = opts.blend ?? 'weighted';
    const minVal = opts.minVal ?? 0;
    const EPS = opts.eps ?? 1e-6;

    // ---------- utilidades ----------
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const median = (arr: number[]) => {
        if (!arr.length) return NaN;
        const a = [...arr].sort((a, b) => a - b);
        const m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : 0.5 * (a[m - 1] + a[m]);
    };
    const winsorHi = (arr: number[], pct: number) => {
        if (pct <= 0) return arr.slice();
        const a = [...arr].sort((a, b) => a - b);
        const k = Math.floor((1 - pct) * (a.length - 1));
        const cap = a[clamp(k, 0, a.length - 1)];
        return arr.map(v => Math.min(v, cap));
    };
    // Theil–Sen slope sobre (x, log(y+EPS)) en ventana reciente
    const theilSenSlope = (xs: number[], ys: number[]) => {
        const pairs: number[] = [];
        for (let i = 0; i < xs.length; i++) {
            for (let j = i + 1; j < xs.length; j++) {
                const dx = xs[j] - xs[i];
                if (dx !== 0) pairs.push((ys[j] - ys[i]) / dx);
            }
        }
        return median(pairs.filter(Number.isFinite));
    };
    const WAPE = (ytrue: number[], ypred: number[]) => {
        const num = ytrue.reduce((s, v, i) => s + Math.abs(v - ypred[i]), 0);
        const den = ytrue.reduce((s, v) => s + Math.abs(v), 0) + EPS;
        return num / den;
    };
    const MAE = (ytrue: number[], ypred: number[]) =>
        ytrue.reduce((s, v, i) => s + Math.abs(v - ypred[i]), 0) / (ytrue.length || 1);

    // ---------- 1) SNaive robusto estacional ----------
    const idxNext = n % seasonPeriod;
    const sameSlotVals: number[] = [];
    for (let b = 1; b <= seasonsBack; b++) {
        const pos = n - b * seasonPeriod; // último mismo slot hacia atrás
        if (pos >= 0) sameSlotVals.push(y[pos]);
    }
    const snaiveLevel = median(winsorHi(sameSlotVals, winsorPct));
    const yhatSNaive = Math.max(minVal, snaiveLevel || y[n - 1]);

    // ---------- 2) Tendencia Theil–Sen + factor estacional ----------
    // Estacionalidad multiplicativa simple: y / medias por slot
    const seasonMeans = new Array(seasonPeriod).fill(0).map(() => ({ s: 0, c: 0 }));
    for (let t = 0; t < n; t++) {
        const k = t % seasonPeriod;
        seasonMeans[k].s += y[t];
        seasonMeans[k].c += 1;
    }
    const seasonFactor = (k: number) => {
        const m = seasonMeans[k];
        return m.c ? Math.max(EPS, m.s / m.c) : 1;
    };
    const globalMean = y.reduce((a, b) => a + b, 0) / n;
    // normaliza multiplicativamente
    const yDeseason = y.map((v, t) => v / Math.max(EPS, seasonFactor(t % seasonPeriod)));
    // tendencia robusta en log
    const start = n - recentWindow;
    const xs = Array.from({ length: recentWindow }, (_, i) => i);
    const ysLog = yDeseason.slice(start).map(v => Math.log(Math.max(v, EPS)));
    const b = theilSenSlope(xs, ysLog);
    const a = median(ysLog.map((v, i) => v - b * xs[i])); // intercepto como mediana de residuales
    const nextDeseasonLog = a + b * (xs[xs.length - 1] + 1);
    const nextDeseason = Math.exp(nextDeseasonLog);
    const yhatTheilSen = Math.max(minVal, nextDeseason * Math.max(EPS, seasonFactor(idxNext)));

    // ---------- 3) Polyfit log (grado 1) en ventana reciente ----------
    // y ~ exp(α t + β) en los últimos recentWindow puntos
    const xs2 = xs; // 0..W-1
    const ys2 = y.slice(start).map(v => Math.log(Math.max(v, EPS)));
    // regresión lineal simple por normales (2 parámetros)
    const sx = xs2.reduce((s, v) => s + v, 0);
    const sy = ys2.reduce((s, v) => s + v, 0);
    const sxx = xs2.reduce((s, v) => s + v * v, 0);
    const sxy = xs2.reduce((s, v, i) => s + v * ys2[i], 0);
    const denom = (xs2.length * sxx - sx * sx) || EPS;
    const alpha = (xs2.length * sxy - sx * sy) / denom;
    const beta = (sy - alpha * sx) / xs2.length;
    const nextT = xs2[xs2.length - 1] + 1;
    const yhatPolyLog = Math.max(minVal, Math.exp(alpha * nextT + beta));

    // ---------- Backtest 1-step (rolling) ----------
    function simulate1step(model: 'snaive' | 'theilsen' | 'polylog'): number[] {
        const preds: number[] = [];
        for (let t = n - backQ; t < n; t++) {
            if (model === 'snaive') {
                const k = t % seasonPeriod;
                const vals: number[] = [];
                for (let b = 1; b <= seasonsBack; b++) {
                    const pos = t - b * seasonPeriod;
                    if (pos >= 0) vals.push(y[pos]);
                }
                const lv = median(winsorHi(vals, winsorPct));
                preds.push(Math.max(minVal, lv || y[Math.max(0, t - 1)]));
            } else if (model === 'theilsen') {
                const W = Math.min(recentWindow, t);
                const st = Math.max(0, t - W);
                const xx = Array.from({ length: t - st }, (_, i) => i);
                const dese = y.slice(st, t).map((v, i2) => v / Math.max(EPS, seasonFactor((st + i2) % seasonPeriod)));
                const yy = dese.map(v => Math.log(Math.max(v, EPS)));
                if (yy.length < 2) { preds.push(y[t - 1]); continue; }
                const sl = theilSenSlope(xx, yy);
                const ic = median(yy.map((v, i) => v - sl * xx[i]));
                const next = Math.exp(ic + sl * (xx[xx.length - 1] + 1)) * Math.max(EPS, seasonFactor(k));
                const k = t % seasonPeriod;
                preds.push(Math.max(minVal, next));
            } else {
                const W = Math.min(recentWindow, t);
                const st = Math.max(0, t - W);
                const xx = Array.from({ length: t - st }, (_, i) => i);
                const yy = y.slice(st, t).map(v => Math.log(Math.max(v, EPS)));
                if (yy.length < 2) { preds.push(y[t - 1]); continue; }
                const sx = xx.reduce((s, v) => s + v, 0);
                const sy = yy.reduce((s, v) => s + v, 0);
                const sxx = xx.reduce((s, v) => s + v * v, 0);
                const sxy = xx.reduce((s, v, i) => s + v * yy[i], 0);
                const den = (xx.length * sxx - sx * sx) || EPS;
                const a1 = (xx.length * sxy - sx * sy) / den;
                const b1 = (sy - a1 * sx) / xx.length;
                const next = Math.exp(a1 * (xx[xx.length - 1] + 1) + b1);
                preds.push(Math.max(minVal, next));
            }
        }
        return preds;
    }

    const ytrue = y.slice(n - backQ, n);
    const pS = simulate1step('snaive');
    const pT = simulate1step('theilsen');
    const pP = simulate1step('polylog');

    const metrics = {
        snaive: { MAE: MAE(ytrue, pS), WAPE: WAPE(ytrue, pS) },
        theilsen: { MAE: MAE(ytrue, pT), WAPE: WAPE(ytrue, pT) },
        polylog: { MAE: MAE(ytrue, pP), WAPE: WAPE(ytrue, pP) },
    };

    // ---------- elección/ponderación ----------
    const cand = { snaive: yhatSNaive, theilsen: yhatTheilSen, polylog: yhatPolyLog };
    if (blendMode === 'best') {
        const entries = Object.entries(metrics) as any as [keyof typeof metrics, { WAPE: number }][];
        entries.sort((a, b) => a[1].WAPE - b[1].WAPE);
        const bestKey = entries[0][0] as keyof typeof cand;
        return {
            yhat: cand[bestKey],
            components: cand,
            choice: bestKey as any,
            metrics
        };
    } else {
        const wS = 1 / (metrics.snaive.WAPE + EPS);
        const wT = 1 / (metrics.theilsen.WAPE + EPS);
        const wP = 1 / (metrics.polylog.WAPE + EPS);
        const ws = wS + wT + wP;
        const weights = { snaive: wS / ws, theilsen: wT / ws, polylog: wP / ws };
        const yhat = Math.max(minVal,
            weights.snaive * yhatSNaive +
            weights.theilsen * yhatTheilSen +
            weights.polylog * yhatPolyLog
        );
        return {
            yhat,
            components: cand,
            choice: 'weighted',
            weights,
            metrics
        };
    }
}
