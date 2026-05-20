import { ICreateKardex_Movimiento } from '../interface/Kardex_Movimientos_Articulo.interface';
import { Kardex_Movimiento_ArticuloRepository, IFiltrosMovimientos } from '../repositories/Kardex_Movimiento_Articulo.repository';

export const KardexService = {

    crear: async (data: ICreateKardex_Movimiento) => {
        return await Kardex_Movimiento_ArticuloRepository.create(data);
    },

    obtenerMovimientos: async (filtros: IFiltrosMovimientos) => {
        return await Kardex_Movimiento_ArticuloRepository.findMovimientos(filtros);
    },
        
    obtenerProyecciones: async (opts: {
        empresas?: string[];
        id_articulo?: string;
        dias?: number;
        today?: string;
    }) => {
        return await Kardex_Movimiento_ArticuloRepository.getTotalesPorPeriodos({
            empresas: opts.empresas,
            articulo: opts.id_articulo,
            dias: opts.dias,
            today: opts.today,
        });
    },
    obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
        return await Kardex_Movimiento_ArticuloRepository.getExistencias(id_empresa, id_articulo);
    },

    // obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
    //     return await Kardex_Movimiento_ArticuloRepository.getExistencias(id_empresa, id_articulo);
    // },
};
