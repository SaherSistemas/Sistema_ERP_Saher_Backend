export interface IEmpresaSucursal {
    id_empre: string;
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;            // 'M' = Matriz, 'S' = Sucursal

    calle_empre: string;
    id_colonia_empre: string;
    correo_empre: string;
    tele_empre: string;
    status_empre: boolean;
}
export interface ICrearEmpresaSucursal {
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;            // 'M' o 'S'
    calle_empre: string;
    id_colonia_empre: string;
    correo_empre: string;
    tele_empre: string;
    status_empre: boolean;
}
export interface IUpdateEmpresaSucursal {
    nom_empre?: string;
    rfc_empre?: string;
    tipo_empre?: string;
    calle_empre?: string;
    id_colonia_empre?: string;
    correo_empre?: string;
    tele_empre?: string;
    status_empre?: boolean
}
