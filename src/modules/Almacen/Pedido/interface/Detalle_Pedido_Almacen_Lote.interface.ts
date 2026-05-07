export interface IDetallePedidoAlmacenLoteItem {
    id_stock_ubicacion_lote: string;
    id_lote_sucursal: string;
    id_ubicacion_sucursal: string | null;
    cantidad: number;
}

export interface INegacionPedido {
    cantidad_negada: number;
    motivo: string;
    comentario?: string | null;
}

export interface ICreateDetallePedidoAlmacenLote {
    id_detalle_pedido: string;
    estado: string;
    lotes: IDetallePedidoAlmacenLoteItem[];
    negacion?: INegacionPedido | null;
}