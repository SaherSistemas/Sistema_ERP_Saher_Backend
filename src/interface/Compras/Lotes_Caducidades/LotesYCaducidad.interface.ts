export interface ILoteSolicitadoCompraCreate {
    id_detallecompr_solicitado: string;
    numerolote_lote: string;
    fechavencimiento_lote: string; // formato ISO string
    cantidad_lote: number;
}
