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
    getProyeccionVentaPrueba: async (ids_empresas: string[], cod_int_artic: string, ventana_dias: number, K_TOP = 10) => {
        /*const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosPrueba({
            articulo: cod_int_artic,
            dias: ventana_dias,
        });

        // Trae STR; si tu repo permite pasar K_TOP, úsalo. Si no, igual tomamos lo que regrese.
        const trasladosK = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodosSTR({
            articulo: cod_int_artic,
            dias: ventana_dias,
            // k: K_TOP    // (opcional, si tu SQL ya acepta este filtro)
        }) as Array<{ numero: number; quincena: string; str_total: number; total: number }> | any;

        const getEnd = (q: string) => {
            if (!q) return "";
            const parts = String(q).split(" a ");
            return (parts[1] ?? parts[0] ?? "").trim();
        };

        // Series base SVM / SVT / X
        const X = rangoTiempo.map(q => Number(q.numero));
        const ySVM = rangoTiempo.map(q => Number(q.svm_total) || 0);
        const ySVT = rangoTiempo.map(q => Number(q.svt_total) || 0);

        // Índices de los K_TOP más recientes por fecha fin
        const idxOrdenadosPorFechaDesc = rangoTiempo
            .map((p, i) => ({ i, end: getEnd(String(p.quincena)) }))
            .sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : 0))
            .map(x => x.i);

        const idxUltK = idxOrdenadosPorFechaDesc.slice(0, K_TOP);

        // Map STR por quincena / endDate
        const mapSTRporQuin = new Map<string, number>();
        const mapSTRporEnd = new Map<string, number>();
        if (Array.isArray(trasladosK)) {
            for (const t of trasladosK) {
                const quin = String(t.quincena).trim();
                const end = getEnd(quin);
                const val = Number(t.str_total ?? t.total ?? 0) || 0;
                if (quin) mapSTRporQuin.set(quin, val);
                if (end) mapSTRporEnd.set(end, val);
            }
        } else if (trasladosK && typeof trasladosK === "object") {
            const quin = String(trasladosK.quincena || "").trim();
            const end = getEnd(quin);
            const val = Number(trasladosK.str_total ?? trasladosK.total ?? 0) || 0;
            if (quin) mapSTRporQuin.set(quin, val);
            if (end) mapSTRporEnd.set(end, val);
        }

        // STR distinto de 0 SOLO para los K_TOP más recientes
        const ySTR = rangoTiempo.map((p, i) => {
            if (!idxUltK.includes(i)) return 0;
            const quin = String(p.quincena).trim();
            const end = getEnd(quin);
            if (mapSTRporQuin.has(quin)) return mapSTRporQuin.get(quin)!;
            if (end && mapSTRporEnd.has(end)) return mapSTRporEnd.get(end)!;
            return 0;
        });

        // Salidas / Totales
        const ySalidas = ySVM.map((v, i) => v + (ySVT[i] || 0) + (ySTR[i] || 0));
        const yTotal = rangoTiempo.map(q => Number.isFinite(Number(q.total)) ? Number(q.total) : 0);
        const usaTotalRango = yTotal.some(v => v > 0);
        const yTotalParaModelo = usaTotalRango ? yTotal : ySalidas;

        // ====== FILTRAR para MODELAR con SOLO los K_TOP más recientes ======
        const filtraIdx = <T,>(arr: T[]) => idxUltK.map(ix => arr[ix]);
        const Xk = filtraIdx(X);
        const ySVMk = filtraIdx(ySVM);
        const ySVTk = filtraIdx(ySVT);
        const ySTRk = filtraIdx(ySTR);
        const ySalK = filtraIdx(ySalidas);
        const yTotK = filtraIdx(yTotalParaModelo);

        // Detalle por periodo (sin filtrar, para reportes)
        const detallePorPeriodo = rangoTiempo.map((p, i) => ({
            numero: Number(p.numero),
            quincena: String(p.quincena),
            svm: ySVM[i],
            svt: ySVT[i],
            str: ySTR[i],
            total_salidas: ySalidas[i],
            total: usaTotalRango ? yTotal[i] : ySalidas[i],
        }));

        const tot = (a: number[]) => a.reduce((x, y) => x + (y || 0), 0);
        const total_svm_global = tot(ySVM);
        const total_svt_global = tot(ySVT);
        const total_str_global = tot(ySTR);
        const total_salidas_global = tot(ySalidas);
        const total_global = tot(yTotalParaModelo);

        // Proyección usando SOLO los K_TOP (Xk, y*k)
        const nextPeriodo = Math.max(...X) + 1;
        const grado = Math.min(3, Math.max(1, Xk.length - 1));
        const proyecta = (x: number[], y: number[]) => {
            if (x.length === 0) return 0;
            if (x.length === 1) return Math.round(y[0]);
            try {
                const m = polyfit(x, y, Math.min(grado, x.length - 1));
                return Math.round(polyval(m.coeffs, nextPeriodo));
            } catch {
                return Math.round(tot(y) / Math.max(1, y.length));
            }
        };

        const proj_total = proyecta(Xk, yTotK);
        const proj_svm = proyecta(Xk, ySVMk) * 0.7; // si mantienes este ajuste
        const proj_svt = proyecta(Xk, ySVTk);
        const proj_salidas = proyecta(Xk, ySalK);

        const idxMasActual = idxUltK.length ? idxUltK[0] : -1;
        const salida_real_ultimo = idxMasActual >= 0 ? ySalidas[idxMasActual] : 0;

        return {
            periodos: detallePorPeriodo,
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
                k_usado: K_TOP, // para saber con cuántos periodos se modeló
            },
            ultimo_periodo: idxMasActual >= 0 ? detallePorPeriodo[idxMasActual] : null,
            salida_real_ultimo,
        };
    }*/
    }
}

