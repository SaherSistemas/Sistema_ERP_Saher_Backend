import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Faltante_Factura_Proveedor from '../../models/Devolucion_NC/Faltante/Faltante_Factura_Proveedor';
import NotasCreditoProveedor from '../../models/Devolucion_NC/NC/NotasCreditoProveedor';
import Articulo from '../../modules/Catalogos/Articulos/model/Articulo';

export const Faltante_Factura_ProveedorRepository = {

    /**
     * Devuelve todos los faltantes pendientes ('P') de una compra,
     * navegando por la NC asociada.
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
                    where: { id_compra_proveedor, estado_nc: 'P' },
                    attributes: [],          // solo usamos el where, no necesitamos los datos de NC aquí
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
     * Marca como 'C' (Condonado) todos los faltantes pendientes
     * de una compra cuando se acepta el crédito sin esperar la mercancía.
     */
    marcarCondonados: async (
        id_compra_proveedor: string,
        options?: { transaction?: Transaction }
    ) => {
        // Obtenemos los ids_nc de la compra para filtrar
        const ncs = await NotasCreditoProveedor.findAll({
            where: { id_compra_proveedor },
            attributes: ['id_nc'],
            transaction: options?.transaction,
        });
        const ids_nc = ncs.map(n => n.id_nc);
        if (!ids_nc.length) return;

        return await Faltante_Factura_Proveedor.update(
            { estado: 'C' },
            {
                where: {
                    id_nc: { [Op.in]: ids_nc },
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
