export interface IEstado {
    id_esta: number,
    id_pais_esta: number,
    nom_esta: string,
    clave_ent_fed_estado: string,
    activo_estado: boolean
}

export interface ICreateEstado {
    id_pais_esta: number,
    nom_esta: string
    clave_ent_fed_estado: string,
}

export interface IUpdateEstado {
    id_esta?: number
    id_pais_esta?: number
    clave_ent_fed_estado?: string,
    nom_esta?: string
    activo_estado?: boolean
}