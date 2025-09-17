// src/services/Proyeccion_VentaService.ts
import { Kardex_Movimiento_ArticuloRepository } from "../../repository/Stock/Kardex_Movimiento_Articulo.repository";
import { polyfit, polyval, polyToString } from "../../utils/polyfit";

export const Proyeccion_VentaService = {
    getProyeccionVenta: async (ids_empresas: string[], id_artic: string, ventana_dias: number) => {

        //console.log(ids_empresas, id_artic, ventana_dias);
        const rangoTiempo = await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodos({ empresas: ids_empresas, articulo: id_artic, dias: ventana_dias, });

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
};
