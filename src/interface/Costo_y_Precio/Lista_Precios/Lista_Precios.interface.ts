export interface IListaDePrecio {
    id_lista_precio : string;
    cod_int_lista_precio: number;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
    status_lista_precios: string;
}

export interface ICreateOrUpdateListaPrecio {
    cod_int_lista_precio: number;
    nombre_lista_precio: string;
    descripcion_lista_precio: string;
}