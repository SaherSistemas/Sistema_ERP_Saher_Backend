import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { Pedido_Almacen_EmpaqueRepository } from '../repositories/Pedido_Almacen_Empaque.repository';
import { IActualizarBultosPayload } from '../interface/Pedido_Almacen_Empaque.interface';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import { Entrega_PedidoRepository } from '../repositories/Entrega_Pedido.repository';



export const Entrega_PedidoService = {
    obtenerPedidosPorEntregar: async (id_empresa: string) => {
        return await Entrega_PedidoRepository.obtenerPedidosPorEntregar(id_empresa);
    },
    obtenerPedidosParaEntregaCliente: async (params: {
        tipo: 'ALMACEN' | 'AGENTE';
        id_empresa?: string;
        id_persona?: string;
    }) => {
        return await Entrega_PedidoRepository.obtenerPedidosParaEntregaCliente(params);
    },

    crearSalida: async (dto: {
        tipo_destino: "AGENTE" | "CLIENTE";
        id_agente: string | null;
        id_cliente: string | null;
        bultos_escaneados: string[];
        pedidos: string[];
        tipo_origen: string;
        firma_recibido: string;
    }) => {
        // console.log(dto)
        return await Entrega_PedidoRepository.crearSalida(dto);
    }

};