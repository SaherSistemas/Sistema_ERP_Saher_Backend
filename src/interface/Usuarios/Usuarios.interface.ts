import { IEmpleado } from './Empleado.interface';
import { IRol } from './Rol.interface';

export interface IUsuario {
    id_user: string;
    id_empleado_user: string;
    username: string;
    password_user: string;
    status_user: boolean;
    idrol_user: string;
    empleado?: IEmpleado;  // cuando hagas include
    rol?: IRol;            // cuando hagas include
}

export interface ICreateUsuario {
    id_empleado_user: string;
    password_user: string;
    idrol_user: string;
    status_user?: boolean;  // opcional porque tiene default en DB
}

export interface IUpdateUsuario {
    username?: string;
    password_user?: string;
    idrol_user?: string;
    status_user?: boolean;
}

export interface IIniciarSesion {
    username?: string;
    idinterno_empleado?: number
    password_user: string;
}
