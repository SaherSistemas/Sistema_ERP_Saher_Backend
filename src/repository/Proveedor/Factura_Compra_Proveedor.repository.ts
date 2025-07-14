import { v4 as uuidv4 } from 'uuid';
import { IFactura_Compra_Proveedor, ICreateFacturaCompraProveedor } from '../../interface/Proveedor/Factura_Compra_Proveedor.interfece';
import Factura_Compra_Proveedor from '../../models/Proveedor/Factura_Compra_Proveedor';
import { Compra_ProveedorRepository } from '../Compras/Compra_Proveedor.repository';

export const Factura_Compra_ProveedorRepository = {
    getAll: async (): Promise<IFactura_Compra_Proveedor[]> => {
        return await Factura_Compra_Proveedor.findAll();
    },
    getByID: async (id_comp: string) => {
        return await Factura_Compra_Proveedor.findOne({
            where: {
                id_compra_proveedor: id_comp
            }
        });
    },
    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        const compraProveedor = await Compra_ProveedorRepository.getByID(data.id_compra_proveedor)

        compraProveedor.update({
            folio_factura_compra: data.folio_factura_proveedor,
            inicio_de_registro_lotes: new Date(),
            estado_comp: 'L'
        })

        return await Factura_Compra_Proveedor.create({
            id_factura_proveedor: uuidv4(),
            id_compra_proveedor: data.id_compra_proveedor,
            folio_factura_proveedor: data.folio_factura_proveedor,
            fecha_emision: data.fecha_emision,
            fecha_vencimiento: data.fecha_vencimiento,
            total_factura_proveedor: data.total_factura_proveedor,
            estatus_pago_factura: 'PENDIENTE',
            url_PDF: '',
            url_XML: ''
        })

    }




}