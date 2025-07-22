export interface IDetalleListaDePrecio {
    id_detalle_lista_precio: string;
    id_lista_precios : string;
    id_artic : string;
    precios: number;
}

export interface ICreateOrUpdateIDetalleListaPrecio {
    id_lista_precios : string;
    id_artic : string;
    precios: string;
}