import { ICreateOrUpdateLoteUsadoVenta, ILoteUsadoVenta } from "../LotesYCaducidad/Lote_Usado_Venta.interaface";

export interface IDetalleVenta{
    id_detalle_venta:string;
    id_venta: string;
    id_artic: string;
    cantidad: number;
    precio_unitario: number;
    lote_usado: ILoteUsadoVenta[];
}

export interface ICreateOrUpdateDetalleVenta{
    id_detalle_venta?: string;
    id_venta?: string;
    id_artic: string;
    cantidad: number;
    precio_unitario: number;
      lote_usado: ICreateOrUpdateLoteUsadoVenta[];
}

export interface IDetalleVentaInput {
  id_artic: string;
  cantidad: number;
  precio_unitario: number;
     lote_usado:  ICreateOrUpdateLoteUsadoVenta[]; 
}
