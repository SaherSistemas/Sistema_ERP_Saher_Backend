export interface IUbicacionSucursal {
    id_ubicacion_sucursal_articulo: string;
    id_empresa_sucursal: string;

    tarima_ub: string;
    pasillo_ub: string;
    anaquel_ub: string;
    nivel_ub: string;
    posicion_ub: string;
}


export interface ICrearUbicacionSucursal {
    id_empresa_sucursal: string;

    tarima_ub?: string;
    pasillo_ub: string;
    anaquel_ub: string;
    nivel_ub: string;
    posicion_ub: string;
}

export interface IActualizarUbicacionSucursal {
    tarima_ub?: string;
    pasillo_ub?: string;
    anaquel_ub?: string;
    nivel_ub?: string;
    posicion_ub?: string;
}
