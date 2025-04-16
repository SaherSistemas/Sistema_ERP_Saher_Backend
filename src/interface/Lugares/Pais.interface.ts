export interface IPais {
    id_pais: number
    nom_pais: string
    cod_iso: string
    activo_pais: boolean
}

export interface ICreatePais {
    nom_pais: string,
    cod_iso: string
}
export interface IUpdatePais {
    nom_pais?: string
    cod_iso?: string
    activo_pais?: boolean
}

