export interface ICategoria_Articulo {
    id_categoria: string
    nom_categoria: string
    id_tipoproducto: string
}

export interface ICreateOrUpdateCategoria_Articulo {
    nom_categoria: string
    id_tipoproducto: string
    id_empre?: string | null  // null = global, UUID = exclusiva de esa empresa
}