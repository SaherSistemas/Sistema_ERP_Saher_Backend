export interface IBeneficioCliente {
id_beneficio:string;
id_tipo_cliente:string;
tipo_beneficio: string;
porcentaje_beneficio: string;
status_beneficio: boolean;    
}

export interface ICreateUpdateBeneficioCliente {
id_tipo_cliente:string;
tipo_beneficio: string;
porcentaje_beneficio: number;
status_beneficio: boolean; 
}