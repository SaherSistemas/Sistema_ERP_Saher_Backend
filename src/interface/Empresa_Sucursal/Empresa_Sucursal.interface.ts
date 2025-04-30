export interface IEmpresaSucursal {
    id_empre: string;
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;            // 'M' = Matriz, 'S' = Sucursal
    cp_empre: string;
    calle_empre: string;
    id_ciudad_empre: string;
    correo_empre: string;
    tele_empre: string;
    status_empre: boolean;
}
export interface ICrearEmpresaSucursal {
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;            // 'M' o 'S'
    cp_empre: string;
    calle_empre: string;
    id_ciudad_empre: string;
    correo_empre: string;
    tele_empre: string;
    status_empre: boolean;
}
export interface IUpdateEmpresaSucursal {
    nom_empre?: string;
    rfc_empre?: string;
    tipo_empre?: string;
    cp_empre?: string;
    calle_empre?: string;
    id_ciudad_empre?: string;
    correo_empre?: string;
    tele_empre?: string;
    status_empre?: boolean
}
