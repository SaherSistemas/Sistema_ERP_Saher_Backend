import { v4 as uuidv4 } from 'uuid';
import Usuario from '../../models/Usuarios/Usuario';
import { ICreateUsuario } from '../../interface/Usuarios/Auth.interface';
export const AuthRepository = {

    crearUsuario: async (data: ICreateUsuario, userFinal: string) => {
        const usuarioExistente = await Usuario.findOne({
            where: { id_referencia_persona: data.id_referencia_persona }
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

    actualizarContra: async (usuarioweb: string, nuevaContraHasheada: string) => {
        const usuario = await Usuario.findOne({ where: { username: usuarioweb } });
        if (!usuario) {
            throw new Error('Usuario no encontrado para actualizar la contraseña.');
        }


        return await Usuario.update(
            { password_user: nuevaContraHasheada },
            { where: { username: usuarioweb } }
        );
    }


}