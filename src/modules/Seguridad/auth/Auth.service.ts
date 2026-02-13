import { IIniciarSesion, ICreateUsuario, ICambiarContrasena } from "./Auth.interface"
import { EmpleadoRepository } from "../../RRHH/repositories/Empleado.repository"
import { AuthRepository } from "./Auth.respository"
import { checkPassword, hashPassword } from "../../../utils/hashPassword"
import { generateToken } from "../../../utils/jwt"
import { generarUsernameUnico } from "../../../utils/posiblesUsernames"
import { isUUID } from "../../../utils/validaciones"
import { UsuarioRepository } from "../repositories/Usuario.repository"
import jwt from "jsonwebtoken"
import { Usuario_SucursalRepository } from "../repositories/Usuario_Sucursal.repository"

export const AuthService = {
    createEmpleado: async (data: ICreateUsuario) => {
        const empleado = await EmpleadoRepository.getByIdFlexible(String(data.id_referencia_persona))
        if (!empleado) throw new Error("Empleado no encontrado")
        if (!isUUID(data.id_referencia_persona)) {
            data.id_referencia_persona = empleado.id_empleado
        }
        const usernameFinal = await generarUsernameUnico(
            empleado.nombre_empleado,
            empleado.ap_pat_empleado,
            empleado.ap_mat_empleado
        );
        data.password_user = await hashPassword(data.password_user);
        return await AuthRepository.crearUsuario(data, usernameFinal)
    },
    preloginEmpresas: async (data: IIniciarSesion) => {
        const { username, password_user } = data;
        const usuario = await UsuarioRepository.usuarioPorUser(username);
        if (!usuario) throw new Error('Usuario no encontrado');

        const passwordCorrecta = await checkPassword(password_user, usuario.password_user);
        if (!passwordCorrecta) throw new Error('Contraseña incorrecta.')

        const empresasPermitidas = await Usuario_SucursalRepository.getEmpresasPermitidasUsuario(usuario.id_user)
        // const token = generateToken(usuario.id_user, username)
        return empresasPermitidas;
    },
    iniciarSesion: async (data: IIniciarSesion) => {
        const { username, password_user } = data;
        const usuario = await UsuarioRepository.usuarioPorUser(username);
        if (!usuario) throw new Error('Usuario no encontrado');

        const passwordCorrecta = await checkPassword(password_user, usuario.password_user);
        if (!passwordCorrecta) throw new Error('Contraseña incorrecta.')

        const token = generateToken(usuario.id_user, username, data.id_empresa, usuario.id_referencia_persona)
        return token;
    },
    cambiarContra: async (data: ICambiarContrasena) => {
        const usuario = await UsuarioRepository.usuarioPorUser(data.usuarioweb);
        if (!usuario) throw new Error('Usuario no encontrado');

        const hashedNewPassword = await hashPassword(data.contrawebNueva);

        //ACTUALIZAR CONTRASEÑA
        const actualizarContraseña = await AuthRepository.actualizarContra(data.usuarioweb, hashedNewPassword);

        return actualizarContraseña
        //const actualizacionUsuario = await AuthRepository.actualizarContra()
    },
    user: async (token: string) => {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(decoded)
        if (typeof decoded === 'object' && decoded.id_user) {
            const user = await UsuarioRepository.findByID(decoded.id_user);
            return user
        }

    }
}