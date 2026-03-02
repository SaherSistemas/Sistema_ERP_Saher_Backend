import { CarritoItem } from "./Pedido_Almacen";

export interface ICreateDetallePedidoAlmacen {
  id_pedido_almacen: string;
  id_articulo: string;
  cantidad: number;
  precio_unitario: number;
  es_oferta: boolean;
}



//ACTUALIZAR DETALLE 
export interface IUpdateDetallePedidoAlmacen {
  id_pedido_almacen: string;
  id_articulo: string;
  cant_pedido: number;
}
