import { v4 as uuidv4 } from 'uuid';
import { EmpleadoRepository } from '../../RRHH/repositories/Empleado.repository';

import Usuario_Empresa from '../model/Usuario_Sucursal';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
export const Usuario_SucursalRepository = {

    getEmpresasPermitidasUsuario: async (id_user: string) => {
        const empresasPermitidas = await Usuario_Empresa.findAll({
            where: { id_user },
            include: [
                {
                    model: Empresa_Sucursal,
                    attributes: ['id_empre', 'nom_empre']
                }]
        })

        //console.log(empresasPermitidas)
        return empresasPermitidas;
    },

}