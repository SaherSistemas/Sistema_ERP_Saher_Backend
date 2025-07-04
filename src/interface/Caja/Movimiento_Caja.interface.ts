export interface IMovimientoCaja {
    id_movimiento: string;
    id_corte_movimiento: string;
    tipo_movimiento: string; // 'entrada' | 'salida'
    concepto_movimiento: string; // 'venta' | 'compra' | 'gasto' | etc.
    monto_movimiento: number;
    id_metodo_pago: string;
    referencia_pago?: string; 
    id_usuario: string;
}

export interface IMovimientoCajaCreate {
    id_corte_movimiento: string;
    tipo_movimiento: string; // 'entrada' | 'salida'
    concepto_movimiento: string; // 'venta' | 'compra' | 'gasto' | etc.
    monto_movimiento: number;
    id_metodo_pago: string;
    referencia_pago?: string; 
    id_usuario?: string;
}