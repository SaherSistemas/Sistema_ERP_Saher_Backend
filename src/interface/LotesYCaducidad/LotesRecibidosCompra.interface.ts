export interface ILoteRecibidoCompra {
    id_lotesolicitado: string;
    id_detallecompr_solicitado: string;
    numerolote_lote: string;
    fechavencimiento_lote: Date; // formato ISO: yyyy-mm-dd
    cantidad_lote: number; // cantidad del lote recibido
}