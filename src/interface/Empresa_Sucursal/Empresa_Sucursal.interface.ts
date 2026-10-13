export interface IEmpresaSucursal {
    id_empre: string;
    nom_empre: string;
    rfc_empre: string;
    tipo_empre: string;    // 'M' = Matriz, 'S' = Sucursal
    idgrup_empre: string;   //GRUPO EMPRESA
    calle_empre: string;
    id_colonia_empre: string;
    id_listapreciodefault: string //LISTA DE PRECIO
    correo_empre: string;
    tele_empre: string;
    status_empre: boolean;
    es_empresa_principal: boolean;
    nom_empre_facturacion?: string | null;
    regimen_fiscal_empre?: string | null;      // ej. '601'
    serie_facturacion_empre?: string | null;   // ej. 'FSH'
    leyenda_factura_empre?: string | null;
    id_empresa_sys_anterior?: string | null;   // código en el sistema anterior
    num_cuenta_banco?: string | null;
    id_banco_empresa?: string | null;
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

    es_empresa_principal: boolean;
    nom_empre_facturacion?: string | null;
    regimen_fiscal_empre?: string | null;      // ej. '601'
    serie_facturacion_empre?: string | null;   // ej. 'FSH'
    leyenda_factura_empre?: string | null;
    id_empresa_sys_anterior?: string | null;   // código en el sistema anterior
    num_cuenta_banco?: string | null;
    id_banco_empresa?: string | null;
}
export interface IUpdateEmpresaSucursal {
    id_caja?: string;
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

    es_empresa_principal?: boolean;
    nom_empre_facturacion?: string | null;
    regimen_fiscal_empre?: string | null;      // ej. '601'
    serie_facturacion_empre?: string | null;   // ej. 'FSH'
    leyenda_factura_empre?: string | null;
    id_empresa_sys_anterior?: string | null;   // código en el sistema anterior
    num_cuenta_banco?: string | null;
    id_banco_empresa?: string | null;
}
