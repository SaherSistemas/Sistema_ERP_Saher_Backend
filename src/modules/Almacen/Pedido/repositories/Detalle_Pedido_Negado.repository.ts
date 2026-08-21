import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Detalle_Pedido_Negado from '../model/Detalle_Pedido_Negado';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';

export interface ICreateDetallePedidoNegado {
    id_detalle_pedido_almacen: string;
    cantidad_negada: number;
    motivo: string;
    comentario?: string | null;
}

export const Detalle_Pedido_NegadoRepository = {
    create: async (data: ICreateDetallePedidoNegado, transaction?: Transaction) => {
        return await Detalle_Pedido_Negado.create(
            {
                id_detalle_pedido_negado: uuidv4(),
                id_detalle_pedido_almacen: data.id_detalle_pedido_almacen,
                cantidad_negada: data.cantidad_negada,
                motivo: data.motivo,
                comentario: data.comentario ?? null,
                fecha: new Date(),
                recuperado: false,
                fecha_recuperado: null,
            },
            { transaction }
        );
    },

    // Marca como recuperados todos los registros del agente para un artículo dado
    marcarRecuperadoPorArticulo: async (id_artic: string) => {
        const detalles = await Detalle_Pedido_Almacen.findAll({
            where: { id_articulo: id_artic },
            attributes: ['id_detalle_pedido_almacen'],
            raw: true,
        });
        const ids = detalles.map((d: any) => d.id_detalle_pedido_almacen);
        if (!ids.length) return 0;

        const [affected] = await Detalle_Pedido_Negado.update(
            { recuperado: true, fecha_recuperado: new Date() },
            { where: { id_detalle_pedido_almacen: { [Op.in]: ids }, motivo: 'SIN_EXISTENCIA', recuperado: false } }
        );
        return affected;
    },
};
