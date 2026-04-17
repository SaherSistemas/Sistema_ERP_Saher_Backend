import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Remision from '../model/Remision.model';
import Detalle_Remision from '../model/Detalle_Remision.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Facturas from '../../../Facturas/model/Facturas.model';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';

interface ICreateRemisionRepo {
    id_factura: string;
    id_pedido_alm: string;
    id_cliente_alm: string;   // resuelto por el service desde el pedido
    id_agente: string;        // resuelto por el service desde el pedido
    dias_credito: number;
    subtotal_remision: number;
    iva_remision: number;
    total_remision: number;
    notas?: string;
}

export const RemisionRepository = {

    getAll: async () => {
        return await Remision.findAll({
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
            ],
            order: [['fecha_remision', 'DESC']],
        });
    },

    getByCliente: async (id_cliente_alm: string) => {
        return await Remision.findAll({
            where: { id_cliente_alm },
            include: [
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
            ],
            order: [['fecha_remision', 'DESC']],
        });
    },

    getByIdConDetalles: async (id_remision: string) => {
        return await Remision.findByPk(id_remision, {
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'estatus_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
                { model: Detalle_Remision },
            ],
        });
    },

    create: async (data: ICreateRemisionRepo, folio: number, t: Transaction) => {
        const fecha_remision    = new Date();
        const fecha_vencimiento = new Date();
        fecha_vencimiento.setDate(fecha_vencimiento.getDate() + data.dias_credito);

        return await Remision.create({
            id_remision:       uuidv4(),
            folio_remision:    folio,
            id_factura:        data.id_factura,
            id_pedido_alm:     data.id_pedido_alm,
            id_cliente_alm:    data.id_cliente_alm,
            id_agente:         data.id_agente,
            fecha_remision,
            dias_credito:      data.dias_credito,
            fecha_vencimiento,
            subtotal_remision: data.subtotal_remision,
            iva_remision:      data.iva_remision,
            total_remision:    data.total_remision,
            estatus_remision:  'PEN',
            notas:             data.notas ?? null,
        }, { transaction: t });
    },

    getUltimoFolio: async (): Promise<number> => {
        const ultima = await Remision.findOne({ order: [['folio_remision', 'DESC']] });
        return ultima ? ultima.folio_remision + 1 : 1;
    },

    actualizarEstatus: async (id_remision: string, estatus_remision: string, t?: Transaction) => {
        return await Remision.update(
            { estatus_remision },
            { where: { id_remision }, transaction: t }
        );
    },
};
