export interface IPermiso {
    id_permiso: number;
    modulo_permiso: string;
    accion_permiso:string;
}

export interface ICreateOrUpdatePermiso {
    modulo_permiso: string;
    accion_permiso:string;
}
