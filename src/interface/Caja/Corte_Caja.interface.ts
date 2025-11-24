export interface ICorteCaja {
  id_corte: string;
  id_caja: string;
  id_usuario_apertura: string;
  fecha_apertura: Date;
  id_usuario_cierre?: string;
  fecha_cierre?: Date;
  monto_inicial: number;
  monto_final?: number;
  total_venta?: number;
  // total_movimientos?: number;
  monto_declarado?: number;
  status_corte: boolean;
}

export interface ICreateOrUpdateCorteCaja {
  id_caja: string;
  id_usuario_apertura: string;
  fecha_apertura: Date;
  id_usuario_cierre?: string;
  fecha_cierre?: Date;
  monto_inicial: number;
  monto_final: number;
  total_venta: number;
  // total_movimientos?: number;
  monto_declarado?: number;
  status_corte: boolean;
}
