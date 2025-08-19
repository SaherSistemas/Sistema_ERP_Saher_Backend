export interface ICreateDevoluciones_Compra {
    id_compr_prove: string
    subtotal: number
    iva_total: number
    id_usuario_devolucio: string
}














export interface ICreateDetalleDevolucionCompra {
    id_devo: string
    id_articulo: string
    cantidad: number
    costo_unitario: number
    iva_unitario: number
    motivo: string
    lote: string
    fecha_caducidad: Date
}


