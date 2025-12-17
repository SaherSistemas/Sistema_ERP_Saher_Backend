import { Transaction } from 'sequelize';

import { AgenteRepository } from '../../../repository/Usuarios/Agente_De_Ventas/Agente.repository';
import { dbLocal } from '../../../config/db';
import { ActualizarDetallesPedidoRequest, ICreatePedidoAlmacenCompleto } from '../interface/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../repositories/Detalle_Pedido_Almacen.repository';
import { Pedido_Almacen_Flujo_LogRepository } from '../repositories/Pedido_Almacen_Flujo_Log.repository';

export const Pedido_AlmacenService = {
  getAllDiaAgente: async (fecha: string, id_agente: string) => {
    const agente = await AgenteRepository.getByIdEmpleado(id_agente)

    return await Pedido_AlmacenRepository.getAllDiaAgente(fecha, agente.id_agente);
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


      // 3. Crear pedido
      const nuevoPedido = await Pedido_AlmacenRepository.create(
        {
          ...encabezado,
          cod_int_pedido_alm: folioPedido,

        },
        { transaction: t }
      );

      //INICIAR LOG
      const id_pedido = nuevoPedido.id_pedido_alm;
      const captura_agente = nuevoPedido.id_agente_pedido_alm;
      await Pedido_Almacen_Flujo_LogRepository.iniciarLogPedido(
        {
          id_pedido,
          captura_agente
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
          t
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

  actualizarDetallesPedidoServ: async (data: ActualizarDetallesPedidoRequest) => {


    return await Detalle_Pedido_AlmacenRepository.sincronizarCarrito(data);
  },

 


  finalizarCaptura: async (id_pedido: string) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    //REGISTRAR LOG
    const log = await Pedido_Almacen_Flujo_LogRepository.finalizarLogCapturado(id_pedido, t)
    if (!log) throw new Error('No existe log activo del pedido');

    //CAMBIAR A CA= CAPTURADO 

    const capturado = await Pedido_AlmacenRepository.actualizarFinCapturado(id_pedido, t)
    if (!capturado) throw new Error('No se pudo actualizar el pedido');
    await t.commit();

    return capturado
  }



};
