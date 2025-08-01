export interface IEmpresaSucursal {
    id_empre: string;
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;            // 'M' = Matriz, 'S' = Sucursal
    idgrup_empre: string;   //GRUPO EMPRESA
    calle_empre: string;
    id_colonia_empre: string;
    id_listapreciodefault: string //LISTA DE PRECIO
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
    idgrup_empre: string;   //GRUPO EMPRESA
    id_listapreciodefault: string //LISTA DE PRECIO
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
    idgrup_empre?: string;   //GRUPO EMPRESA
    id_listapreciodefault?: string //LISTA DE PRECIO
    correo_empre?: string;
    tele_empre?: string;
    status_empre?: boolean
}
