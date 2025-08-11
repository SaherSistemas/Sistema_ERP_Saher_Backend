import { IDetalleVenta, IDetalleVentaInput } from "./Detalle_Venta.interface";

export interface IVenta{
    id_venta: string;
    id_cliente: string;
    id_empleado?: string;
    id_empre:string;
    tipo_venta:string;
    id_metodo_pago: string;
    status_venta: string;
      detalle_venta: IDetalleVenta[];
}

export interface ICreateOrUpdateVenta{
    id_venta?: string;
    id_cliente: string;
    id_empleado: string;
    id_empre:string;
    tipo_venta:string;
    id_metodo_pago : string;
    status_venta?: string;
        detalle_venta: IDetalleVenta[];
}

export interface IVentaInput {
  id_cliente?: string;
  id_empleado?: string;
  id_empre: string;
  tipo_venta: string;
  id_metodo_pago: string;
  status_venta: string;
  detalle_venta: IDetalleVentaInput[];
}