import { IMetodoPagoVentaInput } from "../Caja/Metodo_de_Pago.interface";
import {
  ICreateOrUpdateLoteUsadoVenta,
  ILoteUsadoVenta,
  ILoteUsadoVentaInput,
} from "../LotesYCaducidad/Lote_Usado_Venta.interaface";

export interface IDetalleVenta {
  id_detalle_venta: string;
  id_venta: string;
  id_artic: string;
  cantidad: number;
  precio_unitario: number;
  total_renglon: number;
  lote_usado: ILoteUsadoVenta[];
}

export interface ICreateOrUpdateDetalleVenta {
  id_venta: string;
  id_artic: string;
  cantidad: number;
  precio_unitario: number;
  total_renglon: number;
  lote_usado: ICreateOrUpdateLoteUsadoVenta[];
  temp_line_id?: string;
}

export interface IDetalleVentaInput {
  id_venta: string;
  id_artic: string;
  cantidad: number;
  precio_unitario: number;
  total_renglon: number;
  temp_line_id?: string | null;
  lote_usado: ILoteUsadoVentaInput[];
}
