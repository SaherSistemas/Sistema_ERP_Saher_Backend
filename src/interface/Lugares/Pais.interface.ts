export interface IPais {
    id_pais: string;
    id_intpais: number;
    nom_pais: string;
    cod_iso: string;
    activo_pais: boolean;
}

export interface ICreatePais {
    id_intpais?: number;
    nom_pais: string;
    cod_iso: string;
}

export interface IUpdatePais {
    nom_pais?: string;
    cod_iso?: string;
    activo_pais?: boolean;
}
