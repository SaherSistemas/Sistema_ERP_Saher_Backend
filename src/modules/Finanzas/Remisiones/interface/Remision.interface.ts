// =============================================
//  INTERFACES — Remisión
// =============================================

export interface IRemision {
    id_remision: string;
    folio_remision: number;
    id_factura: string;
    id_pedido_alm: string;
    id_cliente_alm: string;    // sacado del pedido automáticamente
    id_agente: string;         // sacado del pedido automáticamente
    fecha_remision: Date;
    dias_credito: number;
    fecha_vencimiento: Date;
    subtotal_remision: number;
    iva_remision: number;
    total_remision: number;
    estatus_remision: string;  // PEN, PAR, LIQ, CAN
    notas?: string;
}

// Solo esto manda el frontend — el service resuelve el resto desde el pedido
export interface ICreateRemision {
    id_factura: string;           // la factura de PG que ya fue timbrada
    dias_credito: number;         // cuántos días de crédito se le dan
    notas?: string;
    detalles: ICreateDetalleRemision[];
}

export interface ICreateDetalleRemision {
    id_articulo: string;
    descripcion_articulo: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    tasa_iva: number;
    importe_iva: number;
}
