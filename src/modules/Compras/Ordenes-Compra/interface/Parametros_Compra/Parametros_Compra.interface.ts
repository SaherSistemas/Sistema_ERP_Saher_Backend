export interface iParametros_Compra {
    id_parametro_comp: string;
    id_empresa: string;
    considerar_temporabilidad: boolean;
    ventana_dias: number;
    dias_a_comprar: number;
    createdAt: string;
    updatedAt: string;
}

export interface ICreateOrUpdateParametros_Compra {
    id_empresa: string;
    considerar_temporabilidad: boolean;
    ventana_dias: number;
    dias_a_comprar: number;
    categoria_excluida?: { id_categoria_art: string }[];
    articulo_excluido?: { id_articulo: string }[];
    /** Empresas en las que, si se vende el artículo, la compra lo marca con un aviso */
    empresa_vigilada?: { id_empresa: string }[];
    /** Si trae alguno, el aviso solo aplica a artículos de esos tipos (p. ej. Patente); vacío = todos */
    tipo_vigilado?: { id_tipo_art: string }[];
}

