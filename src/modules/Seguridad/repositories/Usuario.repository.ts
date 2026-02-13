import { v4 as uuidv4 } from 'uuid';
import { EmpleadoRepository } from '../../RRHH/repositories/Empleado.repository';
import Usuario from '../model/Usuario';
import { Transaction } from 'sequelize';
export const UsuarioRepository = {

    findByID: async (id_user: string, t?: Transaction) => {
        return Usuario.findByPk(id_user, {
            attributes: ['id_user', 'id_referencia_persona', 'username', 'status_user', 'idrol_user'],
            raw: true,
            transaction: t,
        });
    },

    usuarioPorUser: async (username: string) => {
        const user = await Usuario.findOne({ where: { username } });
        return user || null;
    },
    findByIDEmpleado: async (id_empleado: string) => {
        const user = await Usuario.findOne({ where: { id_referencia_persona: id_empleado } })
        return user
    }
}