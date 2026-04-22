import { v4 as uuidv4 } from 'uuid';
import { EmpleadoRepository } from '../../RRHH/repositories/Empleado.repository';
import Usuario from '../model/Usuario';
import Empleado from '../../RRHH/model/Empleado';
import Rol from '../model/Rol';
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
    },

    toggleStatus: async (id_user: string, status: boolean) => {
        return Usuario.update({ status_user: status }, { where: { id_user } });
    },

    getAll: async () => {
        return Usuario.findAll({
            attributes: ['id_user', 'username', 'status_user', 'idrol_user'],
            include: [
                { model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] },
                { model: Rol, attributes: ['nom_rol'] }
            ],
            order: [['username', 'ASC']]
        });
    }
}