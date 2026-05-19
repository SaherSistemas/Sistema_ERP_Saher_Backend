import { IProductoFacturadoInputDTO } from "./Detalle_Factura_Compra_Proveedor.interface";

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
    id_compra_prove_factura: string;
    folio_factura_proveedor: string;
    costo_por_envio: number
    fecha_emision: Date;
    fecha_vencimiento: Date;
    total_factura_proveedor: number;
}


// ===== DTO que RECIBE el Controller desde el Frontend =====





export interface IActualizarEncabezadoFacturaDTO {
    folio_factura_proveedor: string;
    costo_por_envio: number;
    fecha_emision: string;
    fecha_vencimiento: string;
}

//DTO COMPLETO DE LA FACURA COMPRA PROVEEDOR
export interface IGuardarCapturaCompletaControllerDTO {
    id_comp: string;
    id_factura_compra_proveedor: string;
    id_empleado_registro_lotes: number; // o string si en tu BD es UUID
    productos: IProductoFacturadoInputDTO[];
}
