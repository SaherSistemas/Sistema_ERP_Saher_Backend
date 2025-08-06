export interface ILotesArticuloSucursal {
    id_lote_sucursal: string;
    id_artic: string;
    id_empre: string;
    numero_lote_sucursal: string;
    fecha_venci_lote_sucursal: Date;
    cantidad_lote_sucursal: number;
    precio_costo_lote_sucursal: number;
    estado_lote_sucursal: string;
}

export interface ICreaterOrUdateLotesArticuloSucursal {
    id_artic: string;
    id_empre: string;
    numero_lote_sucursal: string;
    fecha_venci_lote_sucursal: Date;
    cantidad_lote_sucursal: number;
    precio_costo_lote_sucursal: number
    estado_lote_sucursal: string;
}