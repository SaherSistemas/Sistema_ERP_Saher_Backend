export interface IDetalle_Compra_Recibido {
    id_detcomprec: string;
    idcompr_detcomprec: string;
    idarticulo_detcomprec: string;
    cantidad_detcomprec: number;
    precio_detcomprec: string;
}

export interface ICreateOrUpdateDetalleCompraRecibido {
    idcompr_detcomprec: string;
    idarticulo_detcomprec: string;
    cantidad_detcomprec: number;
    precio_detcomprec: string;
}

export interface IDetalleCompraRecibidoPayload {
    idcompr_detcomprec: string;
    idarticulo_detcomprec: string;
    cantidad_detcomprec: number;
    precio_detcomprec: number;
    id_detalle_factura_compra_proveedor: string;
}