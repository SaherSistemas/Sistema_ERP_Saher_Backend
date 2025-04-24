import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";
import { Empresa_SucursalRepository } from "../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { v4 as uuidv4 } from 'uuid'
export const Empresa_SucursalService = {
    getAllEmpresas: async (): Promise<IEmpresaSucursal[]> => {
        return await Empresa_SucursalRepository.getAll();
    },
    createEmpresaSucursal: async (data: ICrearEmpresaSucursal) => {
        const uuidEmpresaSucursal = uuidv4()

        return await Empresa_SucursalRepository.crearNuevaSucursalEmpresa(data, uuidEmpresaSucursal)
    }
}