export interface IFactura_Compra_Proveedor {
    id_factura_proveedor: string;
    id_compra_proveedor: string;
    folio_factura_proveedor: string;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    total_factura_proveedor: number;
    estatus_pago_factura: string;
    url_PDF: string;
    url_XML: string;
}

export interface ICreateFacturaCompraProveedor {
    id_compra_proveedor: string;
    folio_factura_proveedor: string;
    costo_por_envio: number
    fecha_emision: Date;
    fecha_vencimiento: Date;
    total_factura_proveedor: number;
}