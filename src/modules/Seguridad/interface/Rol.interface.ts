export interface IRol {
    id_rol: number;
    nom_rol: string;
    prioridad: number;
}

export interface ICreateOrUpdateRol {
    nom_rol?: string;
    prioridad?: number;
}
