export interface IDevolucionDetalleCreate {
    id_articulo?: string | null;
    descripcion_articulo: string;
    cantidad_facturada: number;
    cantidad_devolucion: number;
    precio_unitario: number;
    subtotal_devolucion: number;
}

export interface IDevolucionClienteCreate {
    id_factura: string;
    id_agente: string;
    motivo: 'error_pedido' | 'error_surtido' | 'error_precio' | 'mal_estado' | 'otros';
    motivo_otros?: string | null;
    observaciones?: string | null;
    detalles: IDevolucionDetalleCreate[];
}
