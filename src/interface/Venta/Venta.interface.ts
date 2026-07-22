import { IMetodoPagoVentaInput } from "../Caja/Metodo_de_Pago.interface";
import { IDetalleVenta, IDetalleVentaInput } from "./Detalle_Venta.interface";
import {
  ICreateOrUpdateVentaPago,
  IVentaPagoInput,
} from "../../interface/Venta/Venta_Pago.interface";
import { IRecetaDesdeVenta } from "../RecetaMedica/RecetaMedica.interface";

export type TipoVenta = "CONTADO" | "CREDITO" | "APARTADO" | "MOSTRADOR";
export type StatusVenta = "CONFIRMADA" | "PENDIENTE" | "CANCELADA";

export interface IVenta {
  id_venta: string;
  id_caja: string;
  id_corte: string | null;
  id_cliente?: string;
  id_empleado?: string;
  id_empre: string;
  total_venta: number;
  subtotal?: number | null;
  iva_total?: number | null;
  descuento_total?: number | null;
  cambio?: number | null;
  tipo_venta: TipoVenta;
  status_venta: StatusVenta;
  motivo_cancelacion?: string | null;
  fecha_cancelacion?: Date | null;
  detalle_venta: IDetalleVenta[];
  venta_pago: ICreateOrUpdateVentaPago[];
}

export interface ICreateOrUpdateVenta {
  id_caja: string;
  id_corte: string | null;
  id_cliente?: string | null;
  id_empleado: string;
  id_empre: string;
  total_venta: number;
  subtotal?: number | null;
  iva_total?: number | null;
  descuento_total?: number | null;
  cambio?: number | null;
  tipo_venta: TipoVenta;
  status_venta: StatusVenta;
  motivo_cancelacion?: string | null;
  fecha_cancelacion?: Date | null;
  detalle_venta: IDetalleVenta[];
  venta_pago: IVentaPagoInput[];
}

export interface IVentaInput {
  id_cliente?: string;
  id_empleado?: string;
  id_empre: string;
  id_caja: string;
  id_corte: string | null;
  total_venta: number;
  subtotal?: number | null;
  iva_total?: number | null;
  descuento_total?: number | null;
  cambio?: number | null;
  tipo_venta: TipoVenta;
  status_venta: StatusVenta;
  detalle_venta: IDetalleVentaInput[];
  venta_pago: IVentaPagoInput[];
  recetaPayload?: IRecetaDesdeVenta;
}
