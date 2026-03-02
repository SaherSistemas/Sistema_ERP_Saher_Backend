import { ICreateDetallePedidoAlmacen } from './Detalle_Pedido_Almacen.interface';

export interface IPedidoAlmacen {
  id_pedido_alm: string;
  cod_int_pedido_alm: string;
  fecha_facturado_pedido_alm: Date | string | null;
  status_pedido_alm: string;
  fecha_entrega_alm: Date | string | null;
  fecha_max_entrega_alm: Date | string | null;
  tipo_pedido_alm: string;
  entrega_al_cliente: Date | string | null;
  id_cliente_pedido_alm: string;
  id_agente_pedido_alm: string;
}

export interface ICreatePedidoAlmacen {
  status_pedido_alm: string;
  tipo_pedido_alm: string;
  id_cliente_pedido_alm: string;
  id_agente_pedido_alm: string;
  cod_int_pedido_alm?: string;
  fecha_max_entrega_alm: Date;
}

export interface IUpdatePedidoAlmacen {
  cod_int_pedido_alm?: number;
  fecha_facturado_pedido_alm?: Date | string | null;
  status_pedido_alm?: string;
  fecha_entrega_alm?: Date | string | null;
  fecha_max_entrega_alm?: Date | string | null;
  tipo_pedido_alm?: string;
  entrega_al_cliente?: Date | string | null;
  id_cliente_pedido_alm?: string;
  id_agente_pedido_alm?: string;
}

//DETALLE
export interface ICreateDetallePedidoAlmacens {
  id_articulo: string;
  descripcion: string;
  descripcion_generica: string | null;
  codigo_interno: string | null;

  cantidad: number;
  precio_unitario: number;
  importe: number;

  existencia_disponible: number;
  fecha_caduca_mas_corta: string | null;
  lote_mas_corto: string | null;

  porcentaje_iva: number;
}

export interface ICreatePedidoAlmacenCompleto {
  encabezado: ICreatePedidoAlmacen;
  detalle: ICreateDetallePedidoAlmacen[];
}


//ACTUALIZAR 
export interface CarritoItem {
  cant_pedido: number;
  id_articulo: string;
  iva: number;
  precio_venta: number;
}

export interface ActualizarDetallesPedidoRequest {
  id_pedido: string;
  carrito: CarritoItem[];
}
