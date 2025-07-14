export interface IListaDePrecio {
    id_lista_precio : string;
    cod_int_lista_precio: number;
    id_empre: string;
    detalle_lista_precios: string;
    id_artic : string;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
    fecha_inicio: Date;
    fecha_fin : Date;
    status_lista_precios: string;
}

export interface ICreateOrUpdateListaPrecio {
    cod_int_lista_precio: number;
    id_empre: string;
    detalle_lista_precios: string;
    id_artic : string;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
    fecha_inicio: Date;
    fecha_fin : Date;
    status_lista_precios: string;
}