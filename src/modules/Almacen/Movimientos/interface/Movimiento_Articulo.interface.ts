export type TipoMovimientoArticulo = 'AJUSTE_ENTRADA' | 'SALIDA_MERMA' | 'SALIDA_ENTREGA'

export interface ICreateMovimientoArticulo {
    id_empresa: string
    id_articulo: string
    tipo_movimiento: TipoMovimientoArticulo
    cantidad: number
    fecha: Date
    documento_ref?: string | null
    notas?: string | null
    id_empleado: string
}

export interface IFiltrosMovimientoArticulo {
    id_empresa?: string
    id_articulo?: string
    tipo_movimiento?: TipoMovimientoArticulo
    fecha_inicio?: string
    fecha_fin?: string
    page?: number
    limit?: number
}
