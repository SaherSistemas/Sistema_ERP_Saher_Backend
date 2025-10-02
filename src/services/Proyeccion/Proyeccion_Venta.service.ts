// src/services/Proyeccion_VentaService.ts
import { Kardex_Movimiento_ArticuloRepository } from "../../repository/Stock/Kardex_Movimiento_Articulo.repository";
import { polyfit, polyval, polyToString } from "../../utils/polyfit";

export const Proyeccion_VentaService = {
    getProyeccionVenta: async (ids_empresas: string[], id_artic: string, ventana_dias: number) => {

        //console.log(ids_empresas, id_artic, ventana_dias);
        const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodos({ empresas: ids_empresas, articulo: id_artic, dias: ventana_dias, });
        // console.log(rangoTiempo);
        const X = rangoTiempo.map(q => Number(q.numero));
        const yTotal = rangoTiempo.map(q => Number(q.total));
        const ySVM = rangoTiempo.map(q => Number(q.svm_total));
        const ySVT = rangoTiempo.map(q => Number(q.svt_total));

        const nextPeriodo = Math.max(...X) + 1;
        const grado = Math.min(3, Math.max(1, X.length - 1));

        const mT = polyfit(X, yTotal, grado);
        const mS = polyfit(X, ySVM, grado);
        const mV = polyfit(X, ySVT, grado);

        return {
            rangoTiempo,
            /*  modelos: {
                  total: { grado, coeffs: mT.coeffs, ecuacion: polyToString(mT.coeffs, 4) },
                  svm: { grado, coeffs: mS.coeffs, ecuacion: polyToString(mS.coeffs, 4) },
                  svt: { grado, coeffs: mV.coeffs, ecuacion: polyToString(mV.coeffs, 4) },
              },*/
            proyeccion: {
                periodo: nextPeriodo,
                total: Math.round(polyval(mT.coeffs, nextPeriodo)),
                svm: Math.round(polyval(mS.coeffs, nextPeriodo)),
                svt: Math.round(polyval(mV.coeffs, nextPeriodo)),
            },
        };
    },
    getProyeccionVentaPrueba: async (ids_empresas: string[], cod_int_artic: string, ventana_dias: number) => {
        // 1) Ventas por periodos (SVM / SVT)
        const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosPrueba({
            articulo: cod_int_artic,
            dias: ventana_dias,
        });

        // 2) STR de los últimos 5 periodos (más recientes)
        //    Usa la versión que te di que regresa un ARRAY con hasta 5 filas (k=0..4) ordenadas del más actual al menos reciente
        const trasladosUlt5 = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosSTR({
            articulo: cod_int_artic,
            dias: ventana_dias,
        }) as Array<{ numero: number; quincena: string; str_total: number; total: number }> | any;

        // --- helpers ---
        const getEnd = (q: string) => {
            if (!q) return '';
            const parts = String(q).split(' a ');
            return (parts[1] ?? parts[0] ?? '').trim();
        };

        // 3) Series SVM / SVT
        const X = rangoTiempo.map(q => Number(q.numero));
        const ySVM = rangoTiempo.map(q => Number(q.svm_total) || 0);
        const ySVT = rangoTiempo.map(q => Number(q.svt_total) || 0);

        // 4) Seleccionar los 5 periodos MÁS RECIENTES de ventas (por end_date)
        const idxOrdenadosPorFechaDesc = rangoTiempo
            .map((p, i) => ({ i, end: getEnd(String(p.quincena)) }))
            .sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : 0))
            .map(x => x.i);

        const idxUlt5Ventas = idxOrdenadosPorFechaDesc.slice(0, 5); // índices (en rangoTiempo) de los 5 más recientes

        // 5) Mapear STR por quincena (y de respaldo por end_date)
        const mapSTRporQuin = new Map<string, number>();
        const mapSTRporEnd = new Map<string, number>();
        if (Array.isArray(trasladosUlt5)) {
            for (const t of trasladosUlt5) {
                const quin = String(t.quincena).trim();
                const end = getEnd(quin);
                const val = Number(t.str_total ?? t.total ?? 0) || 0;
                mapSTRporQuin.set(quin, val);
                if (end) mapSTRporEnd.set(end, val);
            }
        } else if (trasladosUlt5 && typeof trasladosUlt5 === 'object') {
            // por si tu llamada aún devuelve solo el último (compat)
            const quin = String(trasladosUlt5.quincena || '').trim();
            const end = getEnd(quin);
            const val = Number(trasladosUlt5.str_total ?? trasladosUlt5.total ?? 0) || 0;
            if (quin) mapSTRporQuin.set(quin, val);
            if (end) mapSTRporEnd.set(end, val);
        }

        // 6) Construir ySTR: STR distinto de 0 SOLO para los 5 más recientes (alineado por quincena o end_date)
        const ySTR = rangoTiempo.map((p, i) => {
            if (!idxUlt5Ventas.includes(i)) return 0; // fuera de top 5 → 0
            const quin = String(p.quincena).trim();
            const end = getEnd(quin);
            if (mapSTRporQuin.has(quin)) return mapSTRporQuin.get(quin)!;
            if (end && mapSTRporEnd.has(end)) return mapSTRporEnd.get(end)!;
            return 0;
        });

        // 7) Salidas por periodo = SVM + SVT + STR(últimos 5)
        const ySalidas = ySVM.map((v, i) => v + (ySVT[i] || 0) + (ySTR[i] || 0));

        // 8) Total para modelo/reportes: si tu SQL ya trae total (SVM+SVT), úsalo; si no, usa ySalidas
        const yTotal = rangoTiempo.map(q => Number.isFinite(Number(q.total)) ? Number(q.total) : 0);
        const usaTotalRango = yTotal.some(v => v > 0);
        const yTotalParaModelo = usaTotalRango ? yTotal : ySalidas;

        // 9) Detalle por periodo
        const detallePorPeriodo = rangoTiempo.map((p, i) => ({
            numero: Number(p.numero),
            quincena: String(p.quincena),
            svm: ySVM[i],
            svt: ySVT[i],
            str: ySTR[i],                // ← solo tendrá valor en los 5 más recientes (si hubo STR)
            total_salidas: ySalidas[i],  // SVM + SVT + STR(últimos 5)
            total: usaTotalRango ? yTotal[i] : ySalidas[i],
        }));

        // 10) Totales globales
        const tot = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);
        const total_svm_global = tot(ySVM);
        const total_svt_global = tot(ySVT);
        const total_str_global = tot(ySTR);          // suma solo lo que cayó en top 5
        const total_salidas_global = tot(ySalidas);      // incluye STR en top 5
        const total_global = tot(yTotalParaModelo);

        // 11) Proyección (opcional; ya incorpora STR en top 5 dentro de ySalidas/yTotalParaModelo)
        const nextPeriodo = Math.max(...X) + 1;
        const grado = Math.min(3, Math.max(1, X.length - 1));
        const proyecta = (x: number[], y: number[]) => {
            if (x.length === 0) return 0;
            if (x.length === 1) return Math.round(y[0]);
            try {
                const m = polyfit(x, y, Math.min(grado, x.length - 1));
                return Math.round(polyval(m.coeffs, nextPeriodo));
            } catch {
                return Math.round(tot(y) / y.length);
            }
        };

        const proj_total = proyecta(X, yTotalParaModelo);
        const proj_svm = proyecta(X, ySVM);
        const proj_svt = proyecta(X, ySVT);
        const proj_salidas = proyecta(X, ySalidas);

        // 12) Dato puntual: salida real del periodo MÁS ACTUAL (índice 0 de idxUlt5Ventas)
        const idxMasActual = idxUlt5Ventas.length ? idxUlt5Ventas[0] : -1;
        const salida_real_ultimo = idxMasActual >= 0 ? ySalidas[idxMasActual] : 0;

        return {
            periodos: detallePorPeriodo,  // SVM, SVT, STR(últimos 5), total_salidas, total
            totales: {
                svm: total_svm_global,
                svt: total_svt_global,
                str: total_str_global,
                salidas: total_salidas_global,
                total: total_global,
            },
            proyeccion: {
                periodo: nextPeriodo,
                total: proj_total,
                svm: proj_svm,
                svt: proj_svt,
                salidas: proj_salidas,
            },
            ultimo_periodo: idxMasActual >= 0 ? detallePorPeriodo[idxMasActual] : null,
            salida_real_ultimo, // SVM + SVT + STR del periodo más actual
        };
    }
}
