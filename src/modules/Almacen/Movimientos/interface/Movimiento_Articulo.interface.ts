export type TipoMovimientoArticulo = 'AJUSTE_ENTRADA' | 'SALIDA_MERMA' | 'SALIDA_ENTREGA'

export interface ICreateMovimientoArticulo {
    id_empresa: string
    id_articulo: string
    tipo_movimiento: TipoMovimientoArticulo
    cantidad: number
    fecha?: Date
    documento_ref?: string | null
    notas?: string | null
    id_empleado: string

    // ── Entrada: sumar a un lote existente, o dar de alta uno nuevo ──────────
    id_lote?: string | null
    numero_lote?: string
    fecha_vencimiento?: string
    costo_unitario?: number | null
    // Entrada en una ubicación concreta (null/omitido = sin ubicación, como antes)
    id_ubicacion_sucursal?: string | null

    // ── Salida: obligatorio, de cuál lote sale la mercancía ──────────────────
    // (reutiliza id_lote de arriba)
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
