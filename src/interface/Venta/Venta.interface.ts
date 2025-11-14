import { IMetodoPagoVentaInput } from "../Caja/Metodo_de_Pago.interface";
import { IDetalleVenta, IDetalleVentaInput } from "./Detalle_Venta.interface";
import {
  ICreateOrUpdateVentaPago,
  IVentaPagoInput,
} from "../../interface/Venta/Venta_Pago.interface";
import { IRecetaDesdeVenta } from "../RecetaMedica/RecetaMedica.interface";

export interface IVenta {
  id_venta: string;
  id_caja: string;
  id_corte: string | null;
  id_cliente?: string;
  id_empleado?: string;
  id_empre: string;
  total_venta: number;
  tipo_venta: string;
  id_metodo_pago: string;
  status_venta: string;
  detalle_venta: IDetalleVenta[];
  venta_pago: ICreateOrUpdateVentaPago[];
}

export interface ICreateOrUpdateVenta {
  id_caja: string;
  id_corte: string | null;
  id_cliente: string;
  id_empleado: string;
  id_empre: string;
  total_venta: number;
  tipo_venta: string;
  id_metodo_pago: string;
  status_venta?: string;
  detalle_venta: IDetalleVenta[];
  venta_pago: IVentaPagoInput[];
}

export interface IVentaInput {
  id_cliente?: string;
  id_empleado?: string;
  id_empre: string;
  id_caja: string;
  total_venta: number;
  tipo_venta: string;
  status_venta: "CONFIRMADA" | "PENDIENTE" | "CANCELADA";
  detalle_venta: IDetalleVentaInput[];
  venta_pago: IVentaPagoInput[];
  recetaPayload?: IRecetaDesdeVenta;
}
