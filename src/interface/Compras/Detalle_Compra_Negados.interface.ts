export interface IDetalle_Compra_Negados {
    id_detcompneg: string;
    id_detcompsol: string;
    idarticulo_detcompneg: string;
    cantidad_negada: number;
    motivo_negado: string;
    recuperado: boolean;
    fecha_negado: Date;
    fecha_limite_recuperacion: Date;
}

export interface ICreateOrUpdateDetalleCompraNegados {
    id_detcompsol: string;
    idarticulo_detcompneg: string;
    cantidad_negada: number;
    motivo_negado: string;
}