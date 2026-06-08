import { v4 as uuidv4 } from 'uuid';
import { EmpleadoRepository } from '../../RRHH/repositories/Empleado.repository';

import Usuario_Empresa from '../model/Usuario_Sucursal';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import { dbLocal } from '../../../config/db';

export const Usuario_SucursalRepository = {

    getEmpresasPermitidasUsuario: async (id_user: string) => {
        const empresasPermitidas = await Usuario_Empresa.findAll({
            where: { id_user },
            include: [
                {
                    model: Empresa_Sucursal,
                    attributes: ['id_empre', 'nom_empre', 'rfc_empre', 'tipo_empre', 'status_empre'],
                }
            ],
        });
        return empresasPermitidas;
    },

    /** Todas las empresas/sucursales disponibles en el sistema */
    getAllEmpresas: async () => {
        return Empresa_Sucursal.findAll({
            attributes: ['id_empre', 'nom_empre', 'rfc_empre', 'tipo_empre', 'status_empre'],
            order: [['nom_empre', 'ASC']],
        });
    },

    /**
     * Reemplaza la lista completa de empresas asignadas a un usuario.
     * Elimina todas las existentes y crea las nuevas dentro de una transacción.
     */
    bulkSet: async (id_user: string, id_empresas: string[]): Promise<void> => {
        await dbLocal.transaction(async (t) => {
            await Usuario_Empresa.destroy({ where: { id_user }, transaction: t });
            if (id_empresas.length > 0) {
                await Usuario_Empresa.bulkCreate(
                    id_empresas.map(id_empresa => ({
                        id_usuario_empresa: uuidv4(),
                        id_user,
                        id_empresa,
                        status_acceso: true,
                    })),
                    { transaction: t }
                );
            }
        });
    },

    /** Activa/desactiva el acceso de un registro individual usuario-empresa */
    toggleAcceso: async (id_usuario_empresa: string, status_acceso: boolean) => {
        const registro = await Usuario_Empresa.findByPk(id_usuario_empresa);
        if (!registro) throw new Error('Registro no encontrado.');
        return registro.update({ status_acceso });
    },
}