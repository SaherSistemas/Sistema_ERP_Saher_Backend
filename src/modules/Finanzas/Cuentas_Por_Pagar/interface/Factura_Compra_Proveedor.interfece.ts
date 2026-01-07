export interface IFactura_Compra_Proveedor {
    id_factura_proveedor: string;
    id_compra_proveedor: string;
    folio_factura_proveedor: string;
    estado_factura_proveedor: string;
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


export interface IProductoCapturaCompleta {
    id_detcompsol: string;
    id_artic: string;
    precio: number;
    descuento: number;
    cantidad_facturada: number;
    lotes: {
        numerolote_lote: string;
        fechavencimiento_lote: string;
        cantidad_lote: number;
        observacion_lote: string | null;
    }[];
}

export interface IGuardarCapturaCompletaDTO {
    id_comp: string;
    id_factura_proveedor: string;
    id_empleado_registro_lotes: number;
    productos: IProductoCapturaCompleta[];
}
