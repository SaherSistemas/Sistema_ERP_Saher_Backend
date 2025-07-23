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
}

