
export interface IIniciarSesion {
    username: string;
    password_user: string;
}

export interface ICreateUsuario {
    id_referencia_persona: string;
    password_user: string;
    idrol_user: string;
}



export interface ICambiarContrasena {
    usuarioweb: string;
    contrawebNueva: string;
}