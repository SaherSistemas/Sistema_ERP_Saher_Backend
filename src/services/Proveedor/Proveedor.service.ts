
import { ProveedorRepository } from "../../repository/Proveedor/Proveedor.repository"
import { ICreateProveedor, IProveedor } from "../../interface/Proveedor/Proveedor.interface";

export const ProveedorService = {
    getAllProveedores: async (): Promise<IProveedor[]> => {
        return await ProveedorRepository.getAll();
    },
    crearProveedor: async (data: ICreateProveedor) => {
        return await ProveedorRepository.createProveedor(data)
    }
}