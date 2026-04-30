import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Faltante_Factura_Proveedor from '../../models/Devolucion_NC/Faltante/Faltante_Factura_Proveedor';
import NotasCreditoProveedor from '../../models/Devolucion_NC/NC/NotasCreditoProveedor';
import Factura_Compra_Proveedor from '../../modules/Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Articulo from '../../modules/Catalogos/Articulos/model/Articulo';

export const Faltante_Factura_ProveedorRepository = {

    /**
     * Devuelve todos los faltantes pendientes ('P') de una compra,
     * navegando por la Factura y la NC asociada.
     */
    getPendientesByCompra: async (
        id_compra_proveedor: string,
        options?: { transaction?: Transaction }
    ) => {
        return await Faltante_Factura_Proveedor.findAll({
            where: { estado: 'P' },
            include: [
                {
                    model: NotasCreditoProveedor,
                    where: { estado_nc: 'P' },
                    attributes: [],
                    required: true,
                },
                {
                    model: Factura_Compra_Proveedor,
                    where: { id_compra_prove_factura: id_compra_proveedor },
                    attributes: [],
                    required: true,
                },
                {
                    model: Articulo,
                    attributes: ['id_artic', 'cod_barr_artic', 'des_artic'],
                },
            ],
            transaction: options?.transaction,
        });
    },

    getPendientesByFactura: async (
        id_factura_proveedor: string,
        options?: { transaction?: Transaction }
    ) => {
        return await Faltante_Factura_Proveedor.findAll({
            where: { id_factura_proveedor, estado: 'P' },
            include: [
                {
                    model: NotasCreditoProveedor,
                    where: { estado_nc: 'P' },
                    attributes: ['id_nc', 'id_factura_proveedor'],
                },
                {
                    model: Articulo,
                    attributes: ['id_artic', 'cod_barr_artic', 'des_artic'],
                },
            ],
            transaction: options?.transaction,
        });
    },

    /**
     * Marca como 'R' (Recibido) los faltantes cuyo artículo
     * fue ingresado al inventario desde dar_entrada_inventario.
     */
    marcarRecibidos: async (
        ids_faltante: string[],
        options?: { transaction?: Transaction }
    ) => {
        if (!ids_faltante.length) return;
        return await Faltante_Factura_Proveedor.update(
            { estado: 'R' },
            {
                where: { id_faltante: { [Op.in]: ids_faltante } },
                transaction: options?.transaction,
            }
        );
    },

    /**
     * Marca como 'C' (Condonado) los faltantes pendientes de una factura específica.
     */
    marcarCondonadosByFactura: async (
        id_factura_proveedor: string,
        options?: { transaction?: Transaction }
    ) => {
        return await Faltante_Factura_Proveedor.update(
            { estado: 'C' },
            {
                where: { id_factura_proveedor, estado: 'P' },
                transaction: options?.transaction,
            }
        );
    },

    /**
     * Marca como 'C' (Condonado) todos los faltantes pendientes
     * de una compra cuando se acepta el crédito sin esperar la mercancía.
     */
    marcarCondonados: async (
        id_compra_proveedor: string,
        options?: { transaction?: Transaction }
    ) => {
        const facturas = await Factura_Compra_Proveedor.findAll({
            where: { id_compra_prove_factura: id_compra_proveedor },
            attributes: ['id_factura_proveedor'],
            transaction: options?.transaction,
        });
        const ids_factura = facturas.map(f => f.id_factura_proveedor);
        if (!ids_factura.length) return;

        return await Faltante_Factura_Proveedor.update(
            { estado: 'C' },
            {
                where: {
                    id_factura_proveedor: { [Op.in]: ids_factura },
                    estado: 'P',
                },
                transaction: options?.transaction,
            }
        );
    },

    /**
     * Crea múltiples faltantes de una vez (usado en finalizarChequeo).
     */
    bulkCreate: async (
        data: Array<{
            id_nc: string;
            id_factura_proveedor: string;
            id_articulo: string;
            cantidad_faltante: number;
            precio_unitario: number;
            iva_unitario: number;
        }>,
        options?: { transaction?: Transaction }
    ) => {
        const rows = data.map(d => ({ id_faltante: uuidv4(), estado: 'P', ...d }));
        return await Faltante_Factura_Proveedor.bulkCreate(rows, {
            transaction: options?.transaction,
        });
    },
};
