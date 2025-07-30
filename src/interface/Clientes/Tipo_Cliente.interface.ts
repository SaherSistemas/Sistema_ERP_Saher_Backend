import { IBeneficioCliente } from "./Beneficio_Cliente.interface";

export interface ITipoCliente {
    id_tipo_cliente : string;
    nom_tipo_cliente: string;
    desc_tipo_cliente: string;  
        beneficio:IBeneficioCliente;  
}
export interface ICreateOrUpdateTipoCliente {
    nom_tipo_cliente: string;
    desc_tipo_cliente: string;  
        beneficio:IBeneficioCliente;  
  
}