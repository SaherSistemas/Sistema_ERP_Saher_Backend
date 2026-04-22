import { v4 as uuidv4 } from 'uuid';
import Permiso_Usuario from '../model/Permiso_Usuario';
import { dbLocal } from '../../../config/db';

export const PermisoUsuarioRepository = {

    getByUserId: async (id_user: string) => {
        return Permiso_Usuario.findAll({
            where: { id_user },
            attributes: ['id_permiso', 'tipo_override'],
        });
    },

    bulkSet: async (id_user: string, overrides: { id_permiso: number; tipo_override: string }[]) => {
        await dbLocal.transaction(async (t) => {
            await Permiso_Usuario.destroy({ where: { id_user }, transaction: t });
            if (overrides.length > 0) {
                await Permiso_Usuario.bulkCreate(
                    overrides.map(o => ({
                        id_permiso_usuario: uuidv4(),
                        id_user,
                        id_permiso: o.id_permiso,
                        tipo_override: o.tipo_override,
                    })),
                    { transaction: t }
                );
            }
        });
    },
};
