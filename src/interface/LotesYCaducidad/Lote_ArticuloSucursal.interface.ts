export interface ILotesArticuloSucursal {
  id_lote_sucursal: string;
  id_artic: string;
  id_empre: string;
  numero_lote_sucursal: string;
  fecha_venci_lote_sucursal: Date;
  cantidad_entrada_lote: number;
  precio_costo_lote_sucursal: number;
  estado_lote_sucursal: string;
}

export interface ICreaterOrUdateLotesArticuloSucursal {
  id_artic: string;
  id_empre: string;
  numero_lote_sucursal: string;
  fecha_venci_lote_sucursal: Date;
  cantidad_entrada_lote?: number;
  precio_costo_lote_sucursal: number;
  estado_lote_sucursal: string;
  id_loterecibido_lote_sucursal?: string | null;
}

export interface IResumenArticulo {
  id_artic: string;
  descripcion: string;
  existencia_total: number;
  existencia_disponible: number;
  fecha_caduca_mas_corta: Date | null;
  lote_mas_corto?: string | null;
}

export interface ICompraAgrupada {
  articulo: any; // puedes tiparlo mejor si quieres
  cantidad_total: number;
  cantidad_total_checada: number;
}
