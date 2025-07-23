import { Factura_Compra_ProveedorRepository } from "../../repository/Proveedor/Factura_Compra_Proveedor.repository";
import { IFactura_Compra_Proveedor, ICreateFacturaCompraProveedor } from "../../interface/Proveedor/Factura_Compra_Proveedor.interfece";

export const Factura_Compra_ProveedorService = {
    getAllFacturas: async (): Promise<IFactura_Compra_Proveedor[]> => {
        return await Factura_Compra_ProveedorRepository.getAll();
    },
    getByIDComp: async (id_comp: string): Promise<IFactura_Compra_Proveedor | null> => {
        return await Factura_Compra_ProveedorRepository.getByID(id_comp);
    },

    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        return await Factura_Compra_ProveedorRepository.guardarFacturaEIniciarCapturaLotes(data)
    },
}