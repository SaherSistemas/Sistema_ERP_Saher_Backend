export interface ICiudad {
    id_ciuda: number
    id_esta_ciuda: number
    nom_ciuda: string
    activo_ciuda: boolean
}

export interface ICreateCiudad {
    id_esta_ciuda: number
    nom_ciuda: string
}

export interface IUpdatedCiudad {
    id_ciuda?: number
    id_esta_ciuda?: number
    nom_ciuda?: string
    activo_ciuda?: boolean
}