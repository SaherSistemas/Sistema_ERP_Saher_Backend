
export interface IProveedor {
    id_prove: string;
    nomcort_prove: string;
    razsoc_prove: string;
    rfc_prove: string;
    calle_prove: string;
    id_colonia_prove: string;
    telef_prove: string;
    corr_prove: string;
    diascre_prove: number;
    limicre_prove: number;
    activo_prove: boolean;
    plazoentrega_prove: number;
    ctabanca_prove: string;
    condpago_prove: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateProveedor {
    nomcort_prove: string;
    razsoc_prove: string;
    rfc_prove: string;
    calle_prove: string;
    id_colonia_prove: string;
    telef_prove: string;
    corr_prove: string;
    diascre_prove: number;
    limicre_prove: number;
    activo_prove: boolean;
    plazoentrega_prove: number;
    ctabanca_prove: string;
    condpago_prove: string;
}


export interface IProveedorUpdateBody {
    nomcort_prove: string;
    razsoc_prove: string;
    rfc_prove: string;
    calle_prove: string;
    corr_prove: string;
    ctabanca_prove: string;
    condpago_prove: string;
    id_colonia_prove: string;
    empresas: string[]; // ← IDs de empresas nuevas
}