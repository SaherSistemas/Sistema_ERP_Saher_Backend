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
    numero_recibo: string;
    id_metodo_pago: string;
    id_forma_pago: string;
    monto_pago: number;
    fecha_pago: Date;
    referencia_pago?: string;
    id_empleado_captura: string;
    notas?: string;
}

// DTO para registrar un pago de recibo con abonos a múltiples CxC de un cliente
export interface IAbonoCxC {
    id_cxc: string;
    monto_abono: number;
}

export interface ICapturarPagoCliente {
    id_cliente_alm: string;
    // numero_recibo se genera en el backend: {cod_identi_agente}_{consecutivo 4 dígitos}
    fecha_deposito: string;       // YYYY-MM-DD
    id_metodo_pago: string;
    id_forma_pago: string;
    referencia_pago?: string;
    id_empleado_captura: string;
    notas?: string;
    abonos: IAbonoCxC[];          // una entrada por cada CxC a abonar
}

// DTO para APLICAR un pago (paso 2 — encargado de pagos)
export interface IAplicarPago {
    id_pago_cxc: string;
    id_empleado_aplica: string;
}
