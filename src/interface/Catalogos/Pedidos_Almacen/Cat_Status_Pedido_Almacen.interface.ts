export interface ICatStatusPedidoAlmacen {
  id_status_pedido_almacen: string; // Ej: EC, CA, CO, FI, FA
  descrip_almacen: string;
  orden: number;
  activo: boolean;
}

export interface ICreateOrUpdateCatStatusPedidoAlmacen {
  id_status_pedido_almacen: string;
  descrip_almacen: string;
  orden: number;
  activo?: boolean;
}
