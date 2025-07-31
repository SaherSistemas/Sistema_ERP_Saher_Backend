import { ITipoCliente } from "./Tipo_Cliente.interface";

export interface ICliente {
    id_cliente: string;
    telefono_cliente: string;
    nombre_cliente: string;
    apellido_pat_cliente: string;
    apellido_mat_cliente?: string;
    fec_nac_cliente: Date; 
    id_colonia: string;
    correo_cliente?: string;
    genero_cliente: string;
    calle_cliente: string; 
    status_cliente: string;
    id_tipo_cliente: string;
    id_lista_precio: string;
    id_empleado: string;
    id_empre: string;
        tipo_cliente: {
        nombre_tipo_cliente: string;
        };
}

export interface ICreateUpdateCliente {
    telefono_cliente: string;
    nombre_cliente: string;
    apellido_pat_cliente: string;
    apellido_mat_cliente?: string;
    fec_nac_cliente: Date;
    id_colonia: string;
    correo_cliente?: string;
    genero_cliente: string; 
    calle_cliente: string; 
    id_tipo_cliente: string;
    id_lista_precio: string;
    id_empleado: string;
    id_empre: string;
}