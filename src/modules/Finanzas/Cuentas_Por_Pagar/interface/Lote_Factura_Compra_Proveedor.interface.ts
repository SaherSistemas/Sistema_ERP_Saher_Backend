//LOTE FACTURA COMPRA PROVEEDOR
export interface ILoteFacturaInputDTO {
  numero_lote: string;
  fecha_caducidad: string;      // recomendado: ISO "YYYY-MM-DD"
  cantidad: number;
  observacion_lote?: string | null;
}







// === Lote repo payload (YA con FK al detalle creado) ===
export interface ILoteFacturaRepoItemDTO {
  id_det_factura_proveedor: string; // FK a detalle_factura creado
  numero_lote: string;
  fecha_caducidad: string | Date;
  precio_articulo_factura?: number;
  cantidad_lote: number;
  observacion_lote?: string | null;
}

export interface ICrearLotesFacturaRepoDTO {
  lotes: ILoteFacturaRepoItemDTO[];
}





