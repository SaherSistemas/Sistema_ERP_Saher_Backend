export interface IDevolucionDetalleCreate {
    id_articulo?: string | null;
    descripcion_articulo: string;
    cantidad_facturada: number;
    cantidad_devolucion: number;
    precio_unitario: number;
    subtotal_devolucion: number;
}

export interface IDevolucionClienteCreate {
    /** Factura timbrada contra la que se devuelve. Viene esta O id_remision, nunca las dos. */
    id_factura?: string;
    /** Remisión sin CFDI contra la que se devuelve (se resuelve con nota de crédito interna, sin timbrar). */
    id_remision?: string;
    id_agente: string;
    motivo: 'error_pedido' | 'error_surtido' | 'error_precio' | 'mal_estado' | 'otros';
    motivo_otros?: string | null;
    observaciones?: string | null;
    detalles: IDevolucionDetalleCreate[];
}
