import { Transaction } from 'sequelize';

import { AgenteRepository } from '../../../Comercial/Agente_Venta/repositories/Agente.repository';
import { dbLocal } from '../../../../config/db';
import { ActualizarDetallesPedidoRequest, ICreatePedidoAlmacenCompleto } from '../interface/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../repositories/Detalle_Pedido_Almacen.repository';
import { Detalle_Pedido_Almacen_LoteRepository } from '../repositories/Detalle_Pedido_Almacen_Lote.repository';
import { Detalle_Pedido_Almacen_AsignacionRepository } from '../repositories/Detalle_Pedido_Almacen_AsignacionRepository';
import { Articulo_Ubicacion_DefaultServices } from '../../../Catalogos/Articulos/feature/Articulo_Ubicacion_Default/Articulo_Ubicacion_Default.service';
import { Stock_Ubicacion_LoteRepository } from '../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository';

export const Pedido_AlmacenService = {
  getAllDiaAgente: async (fecha: string, id_agente: string) => {
    const agente = await AgenteRepository.getByIdEmpleado(id_agente)

    return await Pedido_AlmacenRepository.getAllDiaAgente(fecha, agente.id_agente);
  },
  getDetalleAsignado: async (id_usuario: string, id_empresa: string) => {
    const asignacion = await Detalle_Pedido_Almacen_AsignacionRepository.getDetalleAsignado(id_usuario);
    if (!asignacion) {
      throw new Error('No tienes asignado este pedido o no tienes ningún pedido asignado.');
    }

    console.log("ASIGNACIÓN EN SERVICE:", asignacion)
    const planSurtidoFefo = await Stock_Ubicacion_LoteRepository.getLotesMinimosConUbicaciones(asignacion.detalle.id_articulo, id_empresa, asignacion.detalle.cant_pedida);
    console.log(planSurtidoFefo)
    return { asignacion, planSurtidoFefo };
  },

  asignarPedidoSurtidor: async (id_usuario: string) => {
    const pedidoMasUrgente = await Pedido_AlmacenRepository.getPedidoMasUrgentePorSurtir();
    //console.log("PEDIDO MÁS URGENTE POR SURTIR:", pedidoMasUrgente);
    //ASIGNAR DETALLES A SURTIDOR
    if (pedidoMasUrgente) {
      const t = await dbLocal.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });
      await Pedido_AlmacenRepository.iniciarSurtido(pedidoMasUrgente, t);
      await Detalle_Pedido_Almacen_AsignacionRepository.asignarDetallesPedidoASurtidor(id_usuario, pedidoMasUrgente, t);
      await t.commit();
      return { mensaje: 'Pedido asignado al surtidor.', id_pedido_alm: pedidoMasUrgente };
    } else {
      return { mensaje: 'No hay pedidos por surtir en este momento.' };
    }

  },
  getDetallesPedido: async (id_pedido_alm: string) => {
    return await Detalle_Pedido_AlmacenRepository.findByIDPedido(id_pedido_alm);
  },

  porSurtir: async (id_usuario: string) => {
    const algunoActivoParaMiUsuario = await Detalle_Pedido_Almacen_AsignacionRepository.algunPedidoAsignado(id_usuario);
    const pedidosPorSurtir = await Pedido_AlmacenRepository.porSurtir();


    return {
      algunoActivoParaMiUsuario,
      pedidosPorSurtir
    };
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
    // console.log("ENTRO A SERVICIO FINALIZAR CAPTURA");

    //CAMBIAR A CA= CAPTURADO 

    const capturado = await Pedido_AlmacenRepository.actualizarFinCapturado(id_pedido, t)
    if (!capturado) throw new Error('No se pudo actualizar el pedido');

    //const repartirLotes = await Detalle_Pedido_Almacen_LoteRepository.create(id_pedido, t)

    const pedidoFull = await Pedido_AlmacenRepository.getByID(id_pedido);
    if (!pedidoFull) throw new Error("No se pudo recargar el pedido")
    await t.commit();

    // console.log("PEDIDO FINALIZADO Y CAPTURADO:", capturado)
    return pedidoFull
  }



};
