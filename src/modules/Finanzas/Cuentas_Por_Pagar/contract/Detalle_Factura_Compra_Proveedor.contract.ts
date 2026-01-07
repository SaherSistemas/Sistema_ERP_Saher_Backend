

import { Transaction } from 'sequelize';
import { ICreateDetalleFacturaCompraProveedor, IDetalleFacturaCompraProveedorDTO } from '../interface/Detalle_Factura_Compra_Proveedor.interface';

export interface IDetalleFacturaCompraProveedorRepository {
    create(
        data: ICreateDetalleFacturaCompraProveedor,
        options?: { transaction?: Transaction }
    ): Promise<IDetalleFacturaCompraProveedorDTO>;

    bulkCreate(
        data: ICreateDetalleFacturaCompraProveedor[],
        options?: { transaction?: Transaction }
    ): Promise<IDetalleFacturaCompraProveedorDTO[]>;

    findByFactura(
        id_factura_compra_proveedor: string
    ): Promise<IDetalleFacturaCompraProveedorDTO[]>;

    deleteByFactura(
        id_factura_compra_proveedor: string,
        options?: { transaction?: Transaction }
    ): Promise<number>;
}
