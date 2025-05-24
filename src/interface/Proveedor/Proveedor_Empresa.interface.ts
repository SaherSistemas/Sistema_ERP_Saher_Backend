export interface ICreateProveedorEmpresa {
    id_prove: string;
    id_empre: string;
}

export interface IProveedorEmpresa {
    id_proveemp: string;
    id_prove: string;
    id_empre: string;
    proveedor?: {
        id_prove: string;
        nomcort_prove: string;
    };
    empresa?: {
        id_empre: string;
        nom_empre: string;
    };
}


