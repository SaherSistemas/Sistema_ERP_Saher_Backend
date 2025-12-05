import { Transaction } from 'sequelize';

import {
  ICreateDetallePedidoAlmacens,
  ICreatePedidoAlmacen,
  ICreatePedidoAlmacenCompleto,
  IUpdatePedidoAlmacen
} from '../../interface/Pedidos_Almacen/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../../repository/Pedido_Almacen/Pedido_Almacen.repository';
import { AgenteRepository } from '../../repository/Usuarios/Agente_De_Ventas/Agente.repository';
import { dbLocal } from '../../config/db';
import Prioridad_Agente_Reglas from '../../models/Usuarios/Agente_De_Ventas/Prioridad_Agente_Regla';
import Detalle_Pedido_Almacen from '../../models/PedidosAlmacen/Detalle_Pedido_Almacen';
import { Detalle_Pedido_AlmacenRepository } from '../../repository/Pedido_Almacen/Detalle_Pedido_Almacen.repository';

export const Pedido_AlmacenService = {
  getAll: async () => {
    return await Pedido_AlmacenRepository.getAll();
  },
  getDetallesPedido: async (id_pedido_alm: string) => {
    return Detalle_Pedido_AlmacenRepository.findByIDPedido(id_pedido_alm);
  },

  pedidosEnCaptura: async (id_cliente_alm: string) => {
    return await Pedido_AlmacenRepository.pedidosEnCaptura(id_cliente_alm);
  },
  pedidosEnCotizacion: async (id_cliente_alm: string) => {
    return await Pedido_AlmacenRepository.pedidosEnCotizacion(id_cliente_alm);
  },
  getByID: async (id: string) => {
    return await Pedido_AlmacenRepository.getByID(id);
  },

  getByCodInterno: async (cod: number) => {
    return await Pedido_AlmacenRepository.getByCodInterno(cod);
  },

  create: async (data: ICreatePedidoAlmacenCompleto) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      // 1. Validar agente
      const agente = await AgenteRepository.getByIdEmpleado(data.encabezado.id_agente_pedido_alm);
      if (!agente) throw new Error('Agente no encontrado.');

      // 2. Generar folio interno
      const folioPedido = await Pedido_AlmacenRepository.getFolioPedido(agente.cod_identi_agente);
      //CAMBIAR ID_AGENTE
      const encabezado = data.encabezado;
      encabezado.id_agente_pedido_alm = agente.id_agente;

      //FECHA DE ENTREGA
      const fechaPedido = new Date();
      const fechaMaxEntrega = await Pedido_AlmacenRepository.getFechaMaxEntrega(agente.id_agente, fechaPedido);
      // 3. Crear pedido
      const nuevoPedido = await Pedido_AlmacenRepository.create(
        {
          ...encabezado,
          cod_int_pedido_alm: folioPedido,
          fecha_max_entrega_alm: fechaMaxEntrega
        },
        { transaction: t }
      );
      // 5. Crear / acumular detalles
      for (const item of data.detalle) {
        await Detalle_Pedido_AlmacenRepository.addOrAccumulate(
          {
            ...item,
            id_pedido_almacen: nuevoPedido.id_pedido_alm
          },
          t // <-- muy importante, pasamos la transacción
        );
      }

      // 6. Si todo salió bien: commit final
      await t.commit();

      return nuevoPedido;
    } catch (error) {
      // 5. Rollback
      await t.rollback();
      throw error;
    }
  },

  update: async (id: string, data: IUpdatePedidoAlmacen) => {
    return 'await Pedido_AlmacenRepository.update(id, data)';
  },

  delete: async (id: string) => {
    return await Pedido_AlmacenRepository.delete(id);
  }
};
