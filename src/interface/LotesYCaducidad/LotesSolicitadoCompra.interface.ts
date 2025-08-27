export interface ILoteRecibido {
    id_loterecibido?: string;                // si lo generas tú con uuidv4
    numerolote_lote: string;
    id_detallecompr_recibido: string
    fechavencimiento_lote: Date; // formato ISO: yyyy-mm-dd
    cantidad_lote: number;
    observacion_lote?: string;
}

export interface IDetalleSolicitado {
    id_detallecompr_solicitado: string;
    precio: number;
    lotes: ILoteRecibido[];
}

export interface IDataLotesRecibidos {
    id_comp: string;
    id_empleado_registro_lotes: string
    productos: IDetalleSolicitado[];
}
