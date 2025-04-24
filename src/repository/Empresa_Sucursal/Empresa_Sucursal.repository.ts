import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
export const Empresa_SucursalRepository = {
    getAll: async (): Promise<IEmpresaSucursal[]> => {
        return await Empresa_Sucursal.findAll();
    },
    crearNuevaSucursalEmpresa: async (data: ICrearEmpresaSucursal, uuid_empresasucursal: string) => {
        return await Empresa_Sucursal.create({
            id_empre: uuid_empresasucursal,
            ...data
        })
    },
    updatedSucursal: async (id_empresaSucursal: string, data: IUpdateEmpresaSucursal) => {
        const empresa = await Empresa_Sucursal.findByPk(id_empresaSucursal);
        if (!empresa) return null
        return await empresa.update(data)
    },

}