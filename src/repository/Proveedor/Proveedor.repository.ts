
import { ICreateProveedor, IProveedor } from "../../interface/Proveedor/Proveedor.interface";
import Proveedor from "../../models/Proveedor/Proveedor";
import { v4 as uuidv4 } from 'uuid';
export const ProveedorRepository = {
    getAll: async (): Promise<IProveedor[]> => {
        return await Proveedor.findAll();
    },
    createProveedor: async (data: ICreateProveedor) => {
        const nuevoUUID = uuidv4();

        try {
            return await Proveedor.create({
                id_prove: nuevoUUID,
                ...data
            })
        } catch (error: any) {
            throw error
        }
    }
}