export interface IMargen_Ganacia_Lista {
    id_margen: string;
    id_lista_precio: string;
    id_categoria: string;
    id_presentacion: string;
    margen: number;
}

export interface IMargen_Ganancia_ListaCreate {
    id_lista_precio: string;
    id_categoria: string;
    id_presentacion: string;
    margen: number;
}

export interface IMargen_Ganacia_ListaGet {
    id_lista_precio: string;
    id_categoria: string;
    id_presentacion: string;
}