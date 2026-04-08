import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Pedido_Almacen_Empaque from '../model/Pedido_Almacen_Empaque';
import { Bulto_Pedido } from '../model/Bulto_Pedido';
import { ICrearBultoPayload } from '../interface/Bulto_Pedido.interface';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';

export const Bulto_PedidoRepository = {


    bulkCrearBultos: async (payloads: ICrearBultoPayload[], t?: Transaction) => {
        if (!payloads.length) return [];

        return await Bulto_Pedido.bulkCreate(
            payloads.map((item) => ({
                id_pedido_empaque: item.id_pedido_empaque,
                cod_bulto: item.cod_bulto,
                tipo_bulto: item.tipo_bulto,
                num_bulto: item.num_bulto,
                total_bulto: item.total_bulto,
                escaneado: item.escaneado ?? false
            })),
            { transaction: t }
        );
    },



    getInfoPedidoParaBulto: async (cod_bulto: string): Promise<string> => {
        const bulto = await Bulto_Pedido.findOne({
            where: { cod_bulto },
            include: [
                {
                    model: Pedido_Almacen_Empaque,
                    as: 'pedido_empaque',
                    attributes: ['id_pedido_almacen', 'id_empleado_empaco'],
                    include: [
                        {
                            model: Pedido_Almacen,
                            as: 'pedido',
                            attributes: ['id_cliente_pedido_alm', 'id_agente_pedido_alm', 'cod_int_pedido_alm']
                        }
                    ]
                }
            ]
        });
        if (!bulto) throw new Error('Bulto no encontrado');

        return bulto.id_pedido_empaque;

    }
};