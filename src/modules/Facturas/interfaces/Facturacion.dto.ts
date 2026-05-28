export interface IGenerarFacturaDTO {
    id_pedido_alm:    string;
    id_empresa:       string;
    id_cliente_real?: string;  // Cliente real cuando se factura como Público General
    id_empleado:      string;  // Empleado que ejecuta la facturación (para Kardex)
}

export interface IDetalleEgresoDTO {
    id_articulo: string;
    cantidad:    number;
}

export interface ITimbrarEgresoDTO {
    id_factura_origen: string;
    detalles:          IDetalleEgresoDTO[];
}

export interface ITimbrarPagoDTO {
    id_factura:      string;
    fecha_pago:      string;
    id_forma_pago:   string;
    monto_pago:      number;
    num_parcialidad: number;
    saldo_anterior:  number;
    moneda?:         string;
    id_pago_cxc?:    string;
}
