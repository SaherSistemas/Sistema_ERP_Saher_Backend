export interface IGrupo_Empresa_Lista_Precio {
    id_grupo_empresa_lista_precio: string //UUID IDENTIFICADOR
    id_grup_empresa: string //UUID DE LA TABLA GRUPO_EMPRESA FK
    id_list_precio: string //UUID DE LA TABLA LISTA_PRECIO FK
}

export interface ICreateOrUpdateGrupo_Empresa_Lista_Precio {
    id_grup_empresa?: string //UUID DE LA TABLA GRUPO_EMPRESA FK
    id_list_precio?: string //UUID DE LA TABLA LISTA_PRECIO FK
}