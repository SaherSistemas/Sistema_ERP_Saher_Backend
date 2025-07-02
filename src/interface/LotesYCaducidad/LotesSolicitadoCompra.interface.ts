export interface ILoteRecibido {
    numerolote_lote: string;
    fechavencimiento_lote: Date; // formato ISO: yyyy-mm-dd
    cantidad_solicitada: number;
}

export interface IDetalleSolicitado {
    id_detallecompr_solicitado: string;
    precio_detacompsol: number;
    lotes: ILoteRecibido[];
}

export interface IDataLotesRecibidos {
    id_comp: string;
    productos: IDetalleSolicitado[];
}
