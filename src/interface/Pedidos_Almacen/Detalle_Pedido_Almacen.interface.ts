export interface ICreateDetallePedidoAlmacen {
  id_pedido_almacen: string;
  id_articulo: string;
  cantidad: number;
  precio_unitario: number;
  es_oferta: boolean;
}

export interface IDetallePedidoAlmacen extends ICreateDetallePedidoAlmacen {
  id_detalle_pedido_almacen: string;
  cantidad_surtida: number;
  cantidad_checada: number;
}
