import { ILoteUsadoVenta } from "../LotesYCaducidad/Lote_Usado_Venta.interaface";

export interface IDetalleVenta{
    id_detalle_venta:string;
    id_venta: string;
    id_artic: string;
    cantidad: number;
    precio_unitario: number;
        Lote_usado: ILoteUsadoVenta;
}

export interface ICreateOrUpdateDetalleVenta{
    id_venta: string;
    id_artic: string;
    cantidad: number;
    precio_unitario: number;
        Lote_usado: ILoteUsadoVenta;
}