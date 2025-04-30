import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import { v4 as uuidv4 } from 'uuid';
export const Empresa_SucursalRepository = {
    getAll: async (): Promise<IEmpresaSucursal[]> => {
        return await Empresa_Sucursal.findAll();
    },
    getByID: async (id: string): Promise<IEmpresaSucursal | null> => {
        return await Empresa_Sucursal.findByPk(id)
    },
    crearNuevaSucursalEmpresa: async (data: ICrearEmpresaSucursal) => {

        const nuevoUUID = uuidv4();
        return await Empresa_Sucursal.create({
            id_empre: nuevoUUID,
            ...data
        })
    },
    updatedSucursal: async (id_empresaSucursal: string, data: IUpdateEmpresaSucursal) => {
        const empresa = await Empresa_Sucursal.findByPk(id_empresaSucursal);
        if (!empresa) return null
        return await empresa.update(data)
    },
    statusActualEmpresa: async (id: string) => {
        const empresa = await Empresa_Sucursal.findByPk(id)
        if (!empresa) return null;
        return empresa.status_empre
    },
    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const empresa = await Empresa_Sucursal.findByPk(id)
        if (!empresa) return null;
        return await empresa.update({ status_empre: statusContrario })
    }

}