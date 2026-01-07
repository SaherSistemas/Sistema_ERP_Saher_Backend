
export interface IDetalleFacturaCompraProveedor {
    id_factura_proveedor_detalle: string;
    id_factura_compra_proveedor: string;
    id_articulo: string;
    cantidad_facturada: number;
    costo_unitario: number;
    iva_unitario: number;
    ieps_unitario: number;
    descuento_unitario: number;
    subtotal_unitario: number;
}

export interface ICreateDetalleFacturaCompraProveedor {
    id_factura_compra_proveedor: string;
    id_detallecomprec_det_factura_compr_prov: string;

}
// Para actualizar (por si ocupas después)
export interface IUpdateDetalleFacturaCompraProveedor {
    id_factura_proveedor_detalle: string;
    cantidad_facturada?: number;
    costo_unitario?: number;
    iva_unitario?: number;
    ieps_unituario?: number;
    descuento_unitario?: number;
    subtotal_unitario?: number;
}

// DTO para devolver al frontend (incluyendo info del artículo)
export interface IDetalleFacturaCompraProveedorDTO
    extends IDetalleFacturaCompraProveedor {
    articulo?: {
        id_articulo: string;
        cod_barras?: string;
        nombre_articulo?: string;
        clave_interna?: string;
    };
}