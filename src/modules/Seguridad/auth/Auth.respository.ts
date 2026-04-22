import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import Usuario from '../model/Usuario';
import { ICreateUsuario } from './Auth.interface';
import { dbLocal } from '../../../config/db';

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

    getMisPermisosMenu: async (id_user: string) => {
        // Permisos del rol + grants individuales, menos denies individuales
        const rows = await dbLocal.query<{ modulo_permiso: string; accion_permiso: string }>(`
            SELECT p.modulo_permiso, p.accion_permiso
            FROM permiso p
            INNER JOIN permiso_rol pr ON pr.id_permiso = p.id_permiso
            INNER JOIN usuario u ON u.idrol_user = pr.id_rol
            WHERE u.id_user = :id_user

            UNION

            SELECT p.modulo_permiso, p.accion_permiso
            FROM permiso p
            INNER JOIN permiso_usuario pu ON pu.id_permiso = p.id_permiso
            WHERE pu.id_user = :id_user AND pu.tipo_override = 'grant'

            EXCEPT

            SELECT p.modulo_permiso, p.accion_permiso
            FROM permiso p
            INNER JOIN permiso_usuario pu ON pu.id_permiso = p.id_permiso
            WHERE pu.id_user = :id_user AND pu.tipo_override = 'deny'
        `, {
            replacements: { id_user },
            type: QueryTypes.SELECT,
        });
        return rows;
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