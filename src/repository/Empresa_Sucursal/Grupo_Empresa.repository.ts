import { v4 as uuidv4 } from 'uuid';
import Grupo_Empresa from '../../models/Empresa_Sucursal/Grupo_Empresa';
import { ICrearGrupoEmpresa } from '../../interface/Empresa_Sucursal/Grupo_Empresa.interface';

export const Grupo_EmpresaRepository = {
    getAll: async () => {
        return await Grupo_Empresa.findAll();
    },
    getByID: async (id: string) => {
        return await Grupo_Empresa.findByPk(id);
    },
    crearNuevoGrupoEmpresa: async (data: ICrearGrupoEmpresa) => {

        const nuevoUUID = uuidv4();
        return await Grupo_Empresa.create({
            id_grup_empresa: nuevoUUID,
            ...data
        })
    },
    updatedGrupoEmpresa: async (id_grup_empresa: string, data: ICrearGrupoEmpresa) => {
        const grupo = await Grupo_Empresa.findByPk(id_grup_empresa);
        if (!grupo) return null
        return await grupo.update(data)
    },

}