export interface IListaDePrecio {
    id_lista_precios : string;
    id_interno_lista_precios
    id_empre: string;
    detalle_lista_precios: string;
    id_artic : string;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
    fecha_inicio: Date;
    fecha_fin : Date;
    status_lista_precios: string;
}

export interface ICreateOrUpdateListaDePrecio {
    id_internos_precios: string;
    id_empre: string;
    detalle_lista_precios: string;
    id_artic : string;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
    fecha_inicio: Date;
    fecha_fin : Date;
    status_lista_precios: string;
}