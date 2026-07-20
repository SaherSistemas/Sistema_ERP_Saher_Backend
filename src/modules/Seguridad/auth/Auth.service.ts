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

        // ── Usuario maestro (credenciales en .env, nunca en BD) ──
        if (
            process.env.MASTER_USER &&
            process.env.MASTER_PASSWORD &&
            username === process.env.MASTER_USER &&
            password_user === process.env.MASTER_PASSWORD
        ) {
            // Devuelve todas las empresas del sistema para que pueda elegir
            const todasEmpresas = await Usuario_SucursalRepository.getAllEmpresas();
            return todasEmpresas.map((e: any) => ({ empresa: e }));
        }

        const usuario = await UsuarioRepository.usuarioPorUser(username);
        if (!usuario) throw new Error('Usuario no encontrado');

        const passwordCorrecta = await checkPassword(password_user, usuario.password_user);
        if (!passwordCorrecta) throw new Error('Contraseña incorrecta.')

        const empresasPermitidas = await Usuario_SucursalRepository.getEmpresasPermitidasUsuario(usuario.id_user)
        return empresasPermitidas;
    },
    iniciarSesion: async (data: IIniciarSesion) => {
        const { username, password_user } = data;

        // ── Usuario maestro ──
        if (
            process.env.MASTER_USER &&
            process.env.MASTER_PASSWORD &&
            username === process.env.MASTER_USER &&
            password_user === process.env.MASTER_PASSWORD
        ) {
            const MASTER_ID = '00000000-0000-0000-0000-000000000000';
            return generateToken(MASTER_ID, username, data.id_empresa, MASTER_ID);
        }

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
    getMisPermisosMenu: async (id_user: string) => {
        const rows = await AuthRepository.getMisPermisosMenu(id_user);
        // Agrupa: { dashboard: ['dashboard_general', ...], personal: ['empleados', ...] }
        const permisos: Record<string, string[]> = {};
        for (const row of rows) {
            if (!permisos[row.modulo_permiso]) permisos[row.modulo_permiso] = [];
            if (row.accion_permiso !== 'menu') {
                permisos[row.modulo_permiso].push(row.accion_permiso);
            }
        }
        return permisos;
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