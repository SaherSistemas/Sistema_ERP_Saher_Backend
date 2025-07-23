import { ICreateProveedorEmpresa } from "../../interface/Proveedor/Proveedor_Empresa.interface";
import { Empresa_SucursalRepository } from "../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { ProveedorRepository } from "../../repository/Proveedor/Proveedor.repository";
import { Proveedor_EmpresaRepository } from "../../repository/Proveedor/Proveedor_Empresa.repository";

export const Proveedor_EmpresaService = {

    proveedorEmpresa: async (id_prove: string) => {
        return await Proveedor_EmpresaRepository.findProveedorEmpresas(id_prove);
    },
    createProveedorEmpresa: async (data: ICreateProveedorEmpresa) => {
        const proveedor = await ProveedorRepository.findByPK(data.id_prove)
        if (!proveedor) throw new Error("El proveedor no existe.")

        const empresa = await Empresa_SucursalRepository.getByID(data.id_empre)
        if (!empresa) throw new Error("La empresa no existe.")

        return await Proveedor_EmpresaRepository.create(data)
    },
    deleteByProveedor: async (id_prove: string) => {
        return await Proveedor_EmpresaRepository.deleteByProveedor(id_prove);
    }
}