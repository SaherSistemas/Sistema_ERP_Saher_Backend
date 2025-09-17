// src/services/Proyeccion_VentaService.ts
import { Kardex_MovimientosRepository } from "../../repository/Stock/Kardex_Movimiento.repository";
import { polyfit, polyval, polyToString } from "../../utils/polyfit";

export const Proyeccion_VentaService = {
    getProyeccionVenta: async () => {
        const quincenas = await Kardex_MovimientosRepository.getTotalesPorQuincenas();

        // Números de periodo (1..N)
        const X = quincenas.map((q: any) => Number(q.numero));

        // Valores separados
        const yTotal = quincenas.map((q: any) => Number(q.total));
        const ySVM = quincenas.map((q: any) => Number(q.svm_total));
        const ySVT = quincenas.map((q: any) => Number(q.svt_total));

        // Próximo periodo
        const nextPeriodo = Math.max(...X) + 1;

        // Modelos independientes
        const modelTotal = polyfit(X, yTotal, 3);
        const modelSVM = polyfit(X, ySVM, 3);
        const modelSVT = polyfit(X, ySVT, 3);

        const predTotal = Math.round(polyval(modelTotal.coeffs, nextPeriodo));
        const predSVM = Math.round(polyval(modelSVM.coeffs, nextPeriodo));
        const predSVT = Math.round(polyval(modelSVT.coeffs, nextPeriodo));

        return {
            quincenas, // ya trae svm_total, svt_total, total
            modelos: {
                total: {
                    grado: 3,
                    coeffs: modelTotal.coeffs,
                    ecuacion: polyToString(modelTotal.coeffs, 4),
                },
                svm: {
                    grado: 3,
                    coeffs: modelSVM.coeffs,
                    ecuacion: polyToString(modelSVM.coeffs, 4),
                },
                svt: {
                    grado: 3,
                    coeffs: modelSVT.coeffs,
                    ecuacion: polyToString(modelSVT.coeffs, 4),
                },
            },
            proyeccion: {
                periodo: nextPeriodo,
                total: predTotal,
                svm: predSVM,
                svt: predSVT,
            },
        };
    },
};
