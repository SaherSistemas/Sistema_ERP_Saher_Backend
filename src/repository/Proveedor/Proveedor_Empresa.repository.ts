import { v4 as uuidv4 } from 'uuid';
import { ICreateProveedorEmpresa } from '../../interface/Proveedor/Proveedor_Empresa.interface';
import Proveedor_Empresa from '../../models/Proveedor/Proveedor_Empresa';

export const Proveedor_EmpresaRepository = {
    findProveedorEmpresas: async (id: string) => {
        return await Proveedor_Empresa.findAll({
            where: { id_prove: id },
        })
    },
    create: async (data: ICreateProveedorEmpresa) => {
        const nuevoUUID = uuidv4();
        try {
            return await Proveedor_Empresa.create({
                id_proveemp: nuevoUUID,
                ...data
            })
        } catch (error) {
            throw error
        }
    },
    deleteByProveedor: async (id_prove: string) => {
        return await Proveedor_Empresa.destroy({
            where: { id_prove }
        })
    }
}