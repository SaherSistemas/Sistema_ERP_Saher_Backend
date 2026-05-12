export interface ICreateKardex_Movimiento {
    id_empresa: string
    fecha: Date
    id_articulo: string
    id_lote?: string | null
    tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'TRASLADO' | 'AJUSTE' | 'SURTIDO' | 'VENTA'
    categoria: 'Entrada_Salida' | 'Movimiento_Interno' | 'Movimiento_Externo' | 'AJUSTES'
    id_origen_ubicacion?: string | null
    id_destino_ubicacion?: string | null
    cantidad_movimiento: number
    documento_ref?: string | null
    id_pedido?: string | null
    id_empleado: string
    notas?: string | null
}