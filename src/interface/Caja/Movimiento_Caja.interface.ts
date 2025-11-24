export type TipoMovimiento =
    | "INGRESO"
    | "RETIRO"
    | "REVERSO"
    | "AJUSTE"
    | "APERTURA"
    | "CIERRE";


export type ConceptoMovimiento =
    | "VENTA"
    | "CANCELACION DE VENTA"
    | "DEVOLUCION PARCIAL"
    | "RETIRO PARCIAL"
    | "DEPOSITO"
    | "AJUSTE DE CAJA"
    | "APERTURA DE CAJA"
    | "CIERRE DE CAJA"
    | string;


export interface IMovimientoCaja {
    id_movimiento?: string;
    id_caja: string;
    id_corte: string;
    tipo_movimiento: TipoMovimiento;
    concepto_movimiento: ConceptoMovimiento;
    id_metodo_pago: string;
    monto_movimiento: number;
    referencia?: string;
    id_empleado: string;
}

export interface IMovimientoCajaCreate {
    id_caja: string;
    id_corte: string;
    tipo_movimiento: TipoMovimiento;
    concepto_movimiento: ConceptoMovimiento;
    monto_movimiento: number;
    id_metodo_pago: string;
    referencia?: string;
    id_empleado: string;
}