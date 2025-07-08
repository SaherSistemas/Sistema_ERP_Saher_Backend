export interface ICliente {
    id_cliente: string;
    telefono_cliente: string;
    nombre_cliente: string;
    apellido_pat_cliente: string;
    apellido_mat_cliente?: string;
    fec_nac_cliente: Date; 
    colonia_cliente: string;
    email_cliente?: string;
    genero_cliente: string;
    calle_cliente?: string; 
    id_tipo_cliente: string;
    ID_usuario_alta_cliente: string;
    ID_empresa_alta_cliente: string;
}

export interface ICreateUpdateCliente {
    telefono_cliente: string;
    nombre_cliente: string;
    apellido_pat_cliente: string;
    apellido_mat_cliente?: string;
    fec_nac_cliente: Date;
    colonia_cliente: string;
    email_cliente?: string;
    genero_cliente: string; 
    calle_cliente: string; 
    id_tipo_cliente: string;
}