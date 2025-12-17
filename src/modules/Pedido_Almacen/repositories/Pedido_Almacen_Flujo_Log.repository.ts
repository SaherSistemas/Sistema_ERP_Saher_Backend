import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Pedido_Almacen from '../model/Pedido_Almacen';

import Pedido_Flujo_Log from '../model/Pedido_Almacen_Flujo_Log';
import { ICreateFlujoLog } from '../interface/Pedido_Almacen_Flujo_Log.interface';


export const Pedido_Almacen_Flujo_LogRepository = {
    getByID: async (id_pedido_alm: string) => {
        return await Pedido_Flujo_Log.findOne({ where: { id_pedido_alm } });
    },

    //
    iniciarLogPedido: async (data: ICreateFlujoLog, options?: { transaction?: Transaction }) => {
        return await Pedido_Flujo_Log.create(
            {
                id_ped_flujo: uuidv4(),
                inicio_pedido: new Date(),
                captura_inicio: new Date(),
                ...data
            },
            options
        );
    },

    finalizarLogCapturado: async (id_pedido: string, transaction?: Transaction) => {
        const log = await Pedido_Flujo_Log.findOne({ where: { id_pedido } });
        if (!log) return null;

        return await log.update(
            {
                captura_fin: new Date()
            }, { transaction }
        );
    }
};
