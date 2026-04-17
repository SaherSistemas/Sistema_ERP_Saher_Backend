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
import { ICreateDetallePedidoAlmacenLote } from '../interface/Detalle_Pedido_Almacen_Lote.interface';
import { Detalle_Pedido_Almacen_ChequeoRepository } from '../repositories/Detalle_Pedido_Almacen_ChequeoRepository';
import Pedido_Almacen from '../model/Pedido_Almacen';

export const Pedido_AlmacenService = {
  /**CHEQUEO */

  checarArticulo: async (id_pedido_alm: string, cod_barras: string, cantidad: number, id_empleado: string) => {

    const resultado = await Detalle_Pedido_Almacen_ChequeoRepository.checarArticulo(id_pedido_alm, cod_barras, cantidad, id_empleado);

    const detallesPorChecar = await Detalle_Pedido_Almacen_ChequeoRepository.detallesPorChecar(id_pedido_alm);
    const pedidoTerminado   = detallesPorChecar.length === 0;

    if (pedidoTerminado) {
      await Pedido_AlmacenRepository.pedidoChecado(id_pedido_alm);
    }

    return {
      articulo:       resultado,   // contiene cod_barras, cant_chequeada, filas[]
      pedidoTerminado,
    };
  },
  getPedidoEnChequeo: async (id_empleado: string) => {

    const algunoActivoParaMiUsuario = await Detalle_Pedido_Almacen_ChequeoRepository.algunPedidoAsignadoChequeo(id_empleado);
    const pedidosPorChecar = await Pedido_AlmacenRepository.pedidosPorChecar();

    // console.log(algunoActivoParaMiUsuario)
    return {
      algunoActivoParaMiUsuario,
      pedidosPorChecar
    };
  },
  asignarPedidoChequeo: async (id_empleado: string, id_pedido_alm: string) => {
    //const t0 = Date.now();
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    //   console.log('transaction open:', Date.now() - t0, 'ms');

    try {
      // const t1 = Date.now();
      const pedido = await Pedido_AlmacenRepository.getByCodInterno(id_pedido_alm, t);
      // console.log('getByCodInterno:', Date.now() - t1, 'ms');
      if (!pedido) throw new Error('Pedido no encontrado');

      // const t2 = Date.now();
      await Detalle_Pedido_Almacen_ChequeoRepository.asignarDetallesPedidoAChequeo(id_empleado, pedido.id_pedido_alm, t);
      //  console.log('asignarDetalles total:', Date.now() - t2, 'ms');

      //  const t3 = Date.now();
      await t.commit();
      // console.log('commit:', Date.now() - t3, 'ms');

      // console.log('TOTAL:', Date.now() - t0, 'ms');
      return;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  getDetalleAsignadoChequeo: async (id_empleado: string) => {
    const getDetallesAsignados = await Detalle_Pedido_Almacen_ChequeoRepository.getDetallesAsignados(id_empleado)
    return getDetallesAsignados
  },

  /*FIN CHEQUEO  */
  surtidoArticuloAsignado: async (id_detalle_asignacion: string, reqs: ICreateDetallePedidoAlmacenLote) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    const actualizado = await Detalle_Pedido_Almacen_AsignacionRepository.marcarSurtido(id_detalle_asignacion, t);
    if (!actualizado) throw new Error('No se pudo actualizar el estado del artículo asignado.');
    // console.log("DETALLE ASIGNACIÓN MARCADO COMO SURTIDO:", actualizado);

    const reqsConIdDetalle = {
      ...reqs,
      id_detalle_pedido: actualizado.id_detalle_pedido_almacen
    };
    //console.log(reqsConIdDetalle)
    const crearDetalleLote = await Detalle_Pedido_Almacen_LoteRepository.create(reqsConIdDetalle, t);
    await t.commit();
    return { mensaje: 'Artículo marcado como surtido.' };
  },
  getAllDiaAgente: async (fecha: string, id_agente: string) => {
    const agente = await AgenteRepository.getByIdEmpleado(id_agente)

    return await Pedido_AlmacenRepository.getAllDiaAgente(fecha, agente.id_agente);
  },
  getDetalleAsignado: async (
    id_usuario: string,
    id_empresa: string,
    id_pedido_alm: string,
  ) => {
    const asignacion =
      await Detalle_Pedido_Almacen_AsignacionRepository.getDetalleAsignado(
        id_usuario,
        id_pedido_alm,
      );

    if (!asignacion) {
      const pendientes =
        await Detalle_Pedido_Almacen_AsignacionRepository.countPendientesByPedido(
          id_pedido_alm,
        );

      if (pendientes === 0) {
        await Pedido_AlmacenRepository.marcarPedidoComoSurtido(
          id_pedido_alm
        );
      }

      return null;
    }

    const planSurtidoFefo =
      await Stock_Ubicacion_LoteRepository.getLotesMinimosConUbicaciones(
        asignacion.detalle.id_articulo,
        id_empresa,
        asignacion.detalle.cant_pedida,
      );

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

  getByCodInterno: async (cod: string) => {
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
