import { IEmpleado } from '../../RRHH/interface/Empleado.interface';
import { IRol } from './Rol.interface';

export interface IUsuario {
    id_user: string;
    id_referencia_persona: string;
    username: string;
    password_user: string;
    status_user: boolean;
    idrol_user: string;
    empleado?: IEmpleado;  // cuando hagas include
    rol?: IRol;            // cuando hagas include
}


export interface IUpdateUsuario {
    username?: string;
    password_user?: string;
    idrol_user?: string;
    status_user?: boolean;
}


