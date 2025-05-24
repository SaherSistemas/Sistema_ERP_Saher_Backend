
import { ProveedorRepository } from "../../repository/Proveedor/Proveedor.repository"
import { ICreateProveedor, IProveedor, IProveedorUpdateBody } from "../../interface/Proveedor/Proveedor.interface";

export const ProveedorService = {
    getAllProveedores: async (): Promise<IProveedor[]> => {
        return await ProveedorRepository.getAll();
    },
    crearProveedor: async (data: ICreateProveedor) => {
        return await ProveedorRepository.createProveedor(data)
    },
    getByIdProveedor: async (id: string) => {
        const proveedor = await ProveedorRepository.findByPK(id);
        if (!proveedor) throw new Error("Proveedor no encontrado")
        return proveedor
    },
    cambiarStatus: async (id_prove: string) => {
        const statusActual = await ProveedorRepository.statusActualProveedor(id_prove);
        if (statusActual === null) throw new Error("Proveedor no encontrado.")

        const nuevoStatus = !statusActual;
        const updateStatusProveedor = await ProveedorRepository.cambiarStatus(id_prove, nuevoStatus);
        if (!updateStatusProveedor) throw new Error("No se pudo cambiar el estatus del proveedor.")

        return updateStatusProveedor
    },
    updateProveedor: async (id_prove: string, data: IProveedorUpdateBody) => {
        return await ProveedorRepository.updateProveedor(id_prove, data)
    }
}