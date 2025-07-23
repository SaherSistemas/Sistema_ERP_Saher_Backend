export interface ICiudad {
    id_ciuda: string;
    id_intciuda: number;
    id_esta_ciuda: string;
    nom_ciuda: string;
    activo_ciuda: boolean;
}

export interface ICreateCiudad {
    id_esta_ciuda: string;
    nom_ciuda: string;
}

export interface IUpdateCiudad {
    id_esta_ciuda?: string;
    nom_ciuda?: string;
    activo_ciuda?: boolean;
}
