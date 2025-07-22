export interface ICorteCaja{
    id_corte: string;
    id_caja: string;
    id_usuario_apertura: string;
    fecha_apertura: Date;
    id_usuario_cierre: string;
    fecha_cierre?: Date;
    monto_final: number;
    total_venta: number;
    status_corte: boolean;

}

export interface ICorteCajaCreate{
    id_caja: string;
    id_usuario_apertura: string;
    
}

export interface ICorteCajaUpdate{
    id_usuario_cierre: string;
    monto_final: number;
    total_venta: number;
}