import { ICreateUsuario, IIniciarSesion } from "../../interface/Usuarios/Usuarios.interface"
import { EmpleadoRepository } from "../../repository/Usuarios/Empleado.repository"
import { UsuarioRepository } from "../../repository/Usuarios/Usuario.repository"
import { checkPasswork, hashPassword } from "../../utils/hashPassword"
import { generarUsernameUnico } from "../../utils/posiblesUsernames"
import { isUUID } from "../../utils/validaciones"
import bcrypt from 'bcrypt'
export const UsuarioService = {
    createEmpleado: async (data: ICreateUsuario) => {
        const empleado = await EmpleadoRepository.getByIdFlexible(data.id_empleado_user)
        if (!empleado) throw new Error("Empleado no encontrado")


        if (!isUUID(data.id_empleado_user)) {
            data.id_empleado_user = empleado.id_empleado
        }
        const usernameFinal = await generarUsernameUnico(
            empleado.nombre_empleado,
            empleado.ap_pat_empleado,
            empleado.ap_mat_empleado
        );
        data.password_user = await hashPassword(data.password_user)

        return await UsuarioRepository.crearUsuario(data, usernameFinal)
    },

    iniciarSesion: async (data: IIniciarSesion) => {
        const { username, password_user } = data;

        const usuario = await UsuarioRepository.usuarioPorUser(username);

        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        const passwordCorrecta = await checkPasswork(password_user, usuario.password_user);

        if (!passwordCorrecta) {
            throw new Error('Contraseña incorrecta.')
        }

        return usuario;  // o genera aquí un token si usas JWT
    }


}