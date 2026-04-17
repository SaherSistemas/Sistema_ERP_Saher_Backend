// =============================================
//  INTERFACES — Cuentas por Cobrar
// =============================================

export interface IGenerarCxC {
    id_factura: string;
    dias_credito: number;
}

export interface ICuenta_Por_Cobrar {
    id_cxc: string;
    id_factura?: string;
    id_remision?: string;
    id_cliente_alm: string;
    monto_total: number;
    monto_pagado: number;
    saldo_pendiente: number;
    fecha_vencimiento: Date;
    dias_credito: number;
    estatus_cxc: string;      // PEN, PAR, PAG, VEN
}

// DTO para CAPTURAR un pago (paso 1 — cualquier empleado)
export interface ICapturarPago {
    id_cxc: string;
    id_metodo_pago: string;
    id_forma_pago: string;
    monto_pago: number;
    fecha_pago: Date;
    referencia_pago?: string;
    id_empleado_captura: string;
    notas?: string;
}

// DTO para APLICAR un pago (paso 2 — encargado de pagos)
export interface IAplicarPago {
    id_pago_cxc: string;
    id_empleado_aplica: string;
}
