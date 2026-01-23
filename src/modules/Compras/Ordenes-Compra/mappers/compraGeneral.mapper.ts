import { CompraGeneralDTO } from '../../../../contracts/Compra/Compra_General.dto';
import { makeMapper, asNum, asISO } from '../../../../utils/mapperGenerico';

export const mapCompraGeneral = makeMapper<any, CompraGeneralDTO>(
    {
        total_compra_general: { from: 'total_compra_general', map: asNum },
        total_iva_compra_general: { from: 'total_iva_compra_general', map: asNum },

        /** 🔹 Campo calculado */
        total: (src) => asNum(src.total_compra_general) + asNum(src.total_iva_compra_general),


        fecha_inicio: { from: 'fecha_inicio', map: asISO },
        fecha_fin_captura: { from: 'fecha_fin_captura', map: asISO },
        fecha_completa_fin: { from: 'fecha_completa_fin', map: asISO },
    },
    { autoCopy: true }
);


