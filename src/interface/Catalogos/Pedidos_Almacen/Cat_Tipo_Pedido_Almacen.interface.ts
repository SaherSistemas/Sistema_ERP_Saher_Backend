export interface ICatTipoPedidoAlmacen {
  id_tipo_pedido_almacen: string; // Ej: AUT, AGE
  descripcion: string;
  activo: boolean;
}

export interface ICreateOrUpdateCatTipoPedidoAlmacen {
  id_tipo_pedido_almacen: string;
  descripcion: string;
  activo?: boolean;
}
