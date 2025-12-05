export interface ITipoCliente {
    id_tipo_cliente: string;
    nom_tipo_cliente: string;
    desc_tipo_cliente: string;
    beneficio: {
        porcentaje_beneficio: string;
    };
}
export interface ICreateOrUpdateTipoCliente {
    nom_tipo_cliente: string;
    desc_tipo_cliente: string;
    beneficio: {
        porcentaje_beneficio: string;
    };
}