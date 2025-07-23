export interface IColonia {
    id_colonia: string,
    id_intcolonia: number,
    id_ciuda_colonia: string
    nom_colonia: string,
    cp_colonia: string
    activa_colonia: boolean
}

export interface ICreateColonia {
    nom_colonia: string,
    codpostal_colonia: string,
    id_ciuda_colonia: string
}

export interface IUpdateColonia {
    nom_colonia?: string,
    codpostal_colonia?: string
    id_ciuda_colonia?: string
}