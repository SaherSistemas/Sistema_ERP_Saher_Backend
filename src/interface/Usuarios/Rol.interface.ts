export interface IRol {
    id_rol: string;
    id_introl: number;
    nom_rol: string;
    prioridad: number
}

export interface ICreateOrUpdateRol {
    nom_rol?: string
    prioridad?: number
}
