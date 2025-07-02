export interface ICliente {
    telefono_cliente: string;
    nombre_cliente: string;
    apellido_pat_cliente: string;
    apellido_mat_cliente?: string;
    fec_nac_cliente: Date; // Fecha de nacimiento, opcional
    colonia_cliente: string;
    email_cliente?: string;
    genero_cliente: string; // Opcional, puede ser 'M', 'F' o
    calle_cliente?: string; // Opcional
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
}