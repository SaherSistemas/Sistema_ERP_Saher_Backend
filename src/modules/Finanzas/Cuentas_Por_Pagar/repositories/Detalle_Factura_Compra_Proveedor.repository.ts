import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';
import {
    IDetalleFacturaCompraProveedor,
    ICreateDetalleFacturaCompraProveedor
} from '../interface/Detalle_Factura_Compra_Proveedor.interface';
import Articulo from '../../../../models/Articulos/Articulo';

export const Detalle_Factura_Compra_ProveedorRepository = {
    // Obtener todos (si lo necesitas para debug o admin)
    getAll: async () => {
        return await Detalle_Factura_Compra_Proveedor.findAll();
    },

    // Obtener un detalle por ID
    getByID: async (id_detalle: string) => {
        return await Detalle_Factura_Compra_Proveedor.findOne({
            where: { id_factura_proveedor_detalle: id_detalle },
            include: [{ model: Articulo }]
        });
    },

    // Obtener todos los detalles de una factura
    getByFactura: async (id_factura_compra_proveedor: string) => {
        return await Detalle_Factura_Compra_Proveedor.findAll({
            where: { id_factura_compra_proveedor },
            include: [{ model: Articulo }]
        });
    },

    // Crear un solo renglón de detalle
    create: async (
        data: ICreateDetalleFacturaCompraProveedor,
        options?: { transaction?: Transaction }
    ) => {
        return await Detalle_Factura_Compra_Proveedor.create(
            {
                id_factura_proveedor_detalle: uuidv4(),
                ...data
            },
            options
        );
    },

    // Crear varios renglones (típicamente cuando guardas la factura completa)
    bulkCreate: async (
        data: ICreateDetalleFacturaCompraProveedor[],
        options?: { transaction?: Transaction }
    ) => {
        const registros = data.map(det => ({
            id_factura_proveedor_detalle: uuidv4(),
            ...det
        }));

        return await Detalle_Factura_Compra_Proveedor.bulkCreate(registros, {
            ...options,
            returning: true
        });
    },

    // Borrar todos los renglones de una factura (por recaptura, por ejemplo)
    deleteByFactura: async (
        id_factura_compra_proveedor: string,
        options?: { transaction?: Transaction }
    ): Promise<number> => {
        const eliminados = await Detalle_Factura_Compra_Proveedor.destroy({
            where: { id_factura_compra_proveedor },
            transaction: options?.transaction
        });
        return eliminados;
    }
};
