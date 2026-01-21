export interface IArticulo {
    id_artic: string;
    cod_int_artic: number;
    cod_barr_artic: string;
    des_artic: string;
    des_gener_artic: string;
    desc_detallada_artic: string
    tipo_de_iva: number;
    import_cadylote: string;
    unidmedi_artic: string;
    status_artic: boolean;
    id_presentacion: string;
    fabri_artic?: string | null;
    imagen_artic?: string | null;
    tempora_artic?: number | null;
    satclave_artic: string;
    necesita_receta?: boolean
}
export interface ICreateOrUpdateArticulo {
    cod_barr_artic: string;
    des_artic: string;
    des_gener_artic: string;
    desc_detallada_artic: string
    tipo_de_iva: number;
    import_cadylote: string;
    unidmedi_artic: string;
    status_artic: boolean;
    id_presentacion: string;
    fabri_artic?: string | null;
    imagen_artic?: string | null;
    tempora_artic?: number | null;
    satclave_artic: string;
    necesita_receta?: boolean
}
