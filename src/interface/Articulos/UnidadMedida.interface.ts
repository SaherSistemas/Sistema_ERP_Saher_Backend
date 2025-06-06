export interface IUnidadMedida {
    id_medida: number;
    descrip_medida: string;
    sat_medida: string;
}

export interface ICreateOrUpdateUnidadMedida {
    descrip_medida?: string;
    sat_medida?: string;
}
