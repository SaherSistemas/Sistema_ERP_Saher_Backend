export interface ILoteUsadoVenta{
    id_lote_usado:string;
    id_detalle_venta:string;
    id_lote_sucursal:string;
    cantidad_utilizada:number;
}

export interface ICreateOrUpdateLoteUsadoVenta{
    id_lote_usado:string;
    id_detalle_venta:string;
    id_lote_sucursal:string;
    cantidad_utilizada:number;
}