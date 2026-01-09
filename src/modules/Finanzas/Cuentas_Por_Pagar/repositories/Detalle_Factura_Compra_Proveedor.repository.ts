import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';
import {
    ICrearDetallesFacturaRepoDTO
} from '../interface/Detalle_Factura_Compra_Proveedor.interface';

export const Detalle_Factura_Compra_ProveedorRepository = {
    createMultiple: async (payload: ICrearDetallesFacturaRepoDTO, t: Transaction) => {
        const rows = payload.detalles.map(d => ({
            id_factura_proveedor_detalle: uuidv4(),
            id_factura_compra_proveedor: payload.id_factura_compra_proveedor,
            ...d
        }));

        const created = await Detalle_Factura_Compra_Proveedor.bulkCreate(rows, {
            transaction: t,
            returning: true
        });

        return created.map((r: any) => ({
            id_factura_proveedor_detalle: r.id_factura_proveedor_detalle,
            id_detcompsol: r.id_detcompsol
        }));
    }
};
