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

    // Negación capturada al surtir/finalizar: reemplaza la que ya hubiera quedado de un surtido anterior del mismo
    // renglón (si el surtido se finaliza de nuevo no se acumulan). No toca las de compras ni las del chequeo.
    reemplazarDeSurtido: async (data: ICreateDetallePedidoNegado, transaction?: Transaction) => {
        await Detalle_Pedido_Negado.destroy({
            where: {
                id_detalle_pedido_almacen: data.id_detalle_pedido_almacen,
                recuperado: false,
                motivo: { [Op.ne]: 'DIFERENCIA_CHEQUEO' },
                [Op.or]: [
                    { comentario: null },
                    { comentario: { [Op.notLike]: 'Artículo enviado a compras%' } },
                ],
            },
            transaction,
        });
        return await Detalle_Pedido_NegadoRepository.create(data, transaction);
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
            { where: { id_detalle_pedido_almacen: { [Op.in]: ids }, recuperado: false } }
        );
        return affected;
    },
};
