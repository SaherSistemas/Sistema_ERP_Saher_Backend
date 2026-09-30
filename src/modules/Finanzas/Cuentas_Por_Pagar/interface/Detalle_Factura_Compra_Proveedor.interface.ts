import { ILoteFacturaInputDTO } from "./Lote_Factura_Compra_Proveedor.interface";

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




export interface ICreateDetalleFacturaCompraProveedorConLotes {
    id_factura_compra_proveedor: string;
    id_detallecomprec_det_factura_compr_prov: string;

}





//!NUEVO

//DETALLES FACTURA COMPRA PROVEEDOR
export interface IProductoFacturadoInputDTO {
    id_detcompsol: string;        // referencia al detalle solicitado / compra
    id_artic: string;             // opcional para validaciones extra
    cantidad_facturada: number;   // cantidad total del renglón

    precio: number;
    descuento: number;
    iva: number;

    lotes: ILoteFacturaInputDTO[];
}




// === Detalle repo payload (NO incluye lotes) ===
export interface IDetalleFacturaRepoItemDTO {
    id_detcompsol: string | null;
    id_artic?: string | null;
    cantidad_articulo_facturada: number;
    precio_articulo_factura: number;
    descuento_articulo_factura: number;
    iva_articulo_factura: number;
}

export interface ICrearDetallesFacturaRepoDTO {
    id_factura_compra_proveedor: string;
    detalles: IDetalleFacturaRepoItemDTO[];
}





/*DETALLE FACTURA_COMPRA_PROVEEDOR LOTES  */

export interface IModificarLotesDetalleFacturaDTO {
    id_factura_proveedor_detalle: string;
    id_empresa: string;
    lotes: ILoteDetalleFacturaDTO[];
    /** Opcional: si vienen, se actualizan precio/descuento/IVA/cantidad del detalle */
    precio?: number;
    descuento_pct?: number;
    iva_pct?: number;
    cantidad_articulo_facturada?: number;
    /**
     * false cuando este guardado viene de una EDICIÓN administrativa (corregir precio/
     * cantidad/lotes de una factura ya capturada), no de la pantalla real de Chequeo.
     * Por default es true (comportamiento de siempre, usado por ChequeoFactura) — con
     * false se guardan los datos pero NO se marca el renglón como checado ni se arranca
     * el cronómetro de chequeo de la factura, para no dar por verificado físicamente
     * algo que nadie chequeó.
     */
    marcar_checado?: boolean;
}

export interface ILoteDetalleFacturaDTO {
    /** Si viene, es update. Si viene null/undefined, es create */
    id_lote_factura_compra_proveedor?: string | null;

    numero_lote: string;
    fecha_caducidad: string; // "YYYY-MM-DD"
    cantidad_lote: number;

    observacion_lote?: string | null;

    /** Solo UI: NO se guarda en BD */
    __local_id?: string;
}