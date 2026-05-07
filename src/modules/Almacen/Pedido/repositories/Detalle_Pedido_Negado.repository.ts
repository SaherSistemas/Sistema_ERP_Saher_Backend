import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Detalle_Pedido_Negado from '../model/Detalle_Pedido_Negado';

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
            },
            { transaction }
        );
    },
};
