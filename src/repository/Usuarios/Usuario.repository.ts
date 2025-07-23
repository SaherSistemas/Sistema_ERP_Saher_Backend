import { v4 as uuidv4 } from 'uuid';
import { ICreateUsuario } from '../../interface/Usuarios/Usuarios.interface';
import { EmpleadoRepository } from './Empleado.repository';
import Usuario from '../../models/Usuarios/Usuario';
export const UsuarioRepository = {

    crearUsuario: async (data: ICreateUsuario, userFinal: string) => {
        const usuarioExistente = await Usuario.findOne({
            where: { id_empleado_user: data.id_empleado_user }
        });

        if (usuarioExistente) {
            throw new Error(`Ya existe un usuario asignado al empleado. El usuario es: ${usuarioExistente.username}`);
        }
        const nuevoUUID = uuidv4();

        return await Usuario.create({
            id_user: nuevoUUID,
            username: userFinal,
            ...data
        })
    },
    usuarioPorUser: async (username: string) => {
        const user = await Usuario.findOne({ where: { username } });
        return user || null;
    }
}