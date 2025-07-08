export interface ICorteCaja{
    id_corte: string;
    id_usuario_apertura: string;
    fecha_apertura: Date;
    id_usuario_cierre: string;
    fecha_cierre: Date;
}

export interface ICorteCajaCreate{
    id_caja: string;
    id_usuario_apertura: string;
    fecha_apertura: Date;
    id_usuario_cierre?: string;
    fecha_cierre?: Date;
}