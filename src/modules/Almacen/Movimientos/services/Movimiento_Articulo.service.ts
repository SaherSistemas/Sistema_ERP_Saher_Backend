import { Movimiento_ArticuloRepository } from '../repositories/Movimiento_Articulo.repository'
import { ICreateMovimientoArticulo, IFiltrosMovimientoArticulo } from '../interface/Movimiento_Articulo.interface'

export const Movimiento_ArticuloService = {

    registrar: async (data: ICreateMovimientoArticulo) => {
        return await Movimiento_ArticuloRepository.create(data)
    },

    obtenerMovimientos: async (filtros: IFiltrosMovimientoArticulo) => {
        return await Movimiento_ArticuloRepository.findMovimientos(filtros)
    },

    obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
        return await Movimiento_ArticuloRepository.getExistencias(id_empresa, id_articulo)
    },
}
