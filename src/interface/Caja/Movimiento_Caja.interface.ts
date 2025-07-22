export interface IMovimientoCaja {
    id_movimiento: string;
    id_corte: string;
    tipo_movimiento: string; 
    concepto_movimiento: string; 
    monto_movimiento: number;
    id_metodo_pago: string;
    referencia_pago?: string; 
    id_empleado: string;
}

export interface IMovimientoCajaCreate {
    id_corte: string;
    tipo_movimiento: string; 
    concepto_movimiento: string; 
    monto_movimiento: number;
    id_metodo_pago: string;
    referencia_pago?: string; 
    id_empleado: string;
}