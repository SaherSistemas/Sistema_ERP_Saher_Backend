export interface ILoteRecibidoCompra {
    id_lotesolicitado: string;
    id_detallecompr_solicitado: string;
    numerolote_lote: string;
    fechavencimiento_lote: Date; // formato ISO: yyyy-mm-dd
    cantidad_lote: number; // cantidad del lote recibido
}


export interface ILoteRecibidoChecado {
    id_loterecibido: string;                // si lo generas tú con uuidv4
    id_detallecompr_recibido: string;
    numerolote_lote: string;
    fechavencimiento_lote: Date;   // llega como string ISO o Date; lo normalizamos
    cantidad_lote: number;
    observacion_lote: string | null;
    estado_lote: string;                // tipado más estricto
    motivo_ajuste: string;
}
