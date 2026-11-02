export interface IGenerarFacturaDTO {
    id_pedido_alm:    string;
    id_empresa:       string;
    id_cliente_real?: string;  // Cliente real cuando se factura como Público General
    id_empleado:      string;  // Empleado que ejecuta la facturación (para Kardex)
    forzar_credito?:  boolean; // true = omitir validación de límite de crédito (requiere admin)
    usuario_admin?:   string;
    password_admin?:  string;
    // Administrador que ya autorizó por una solicitud remota (web). Solo lo pone el controlador, después
    // de validar la solicitud: no viene del body. Sustituye a usuario_admin/password_admin.
    autorizador?:     { usuario: string; id_user: string | null };
}

export interface IDetalleEgresoDTO {
    id_articulo: string;
    cantidad:    number;
}

export interface ITimbrarEgresoDTO {
    id_factura_origen: string;
    detalles:          IDetalleEgresoDTO[];
    id_empresa?:       string;
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
    id_empresa?:     string;
}
